import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

/**
 * El banco de pruebas del explorador de expedientes, compartido por las especificaciones que lo
 * ejercitan sin login.
 *
 * Vive aquí y no dentro de un `.spec.ts` porque lo usan dos: la evidencia visual —que demuestra
 * que las pantallas enseñan el expediente real del VPS— y la regresión del visor —que demuestra
 * que el PDF y las imágenes se siguen abriendo cuando el almacén miente sobre el tipo—. Un helper
 * dentro de `tests/e2e` lo recogería el proyecto `chromium` como si fuera una prueba.
 *
 * Los datos NO son inventados: salen del expediente que el alta creó de verdad
 * (`_evidencia-expedientes-2026-09-04/expediente-vps.json`) y los bytes que se previsualizan son
 * los mismos que se subieron al almacén (`material/`).
 */
export const RAIZ = path.join(
  __dirname,
  "../../../_evidencia-expedientes-2026-09-04",
);
export const OUT = path.join(RAIZ, "capturas");
const MATERIAL = path.join(RAIZ, "material");

export type NodoVps = {
  nodoId: string;
  parentId: string | null;
  tipo: "carpeta" | "archivo";
  nombre: string;
  ruta: string;
  origen: string;
  clase: string | null;
  virtual: boolean;
  mimeType: string | null;
  sizeBytes: string | null;
  sha256: string | null;
  objetoAusente: boolean;
  inmutable: boolean;
  creadoEn: string;
  actualizadoEn: string;
};

export const DATOS = JSON.parse(
  fs.readFileSync(path.join(RAIZ, "expediente-vps.json"), "utf8"),
) as {
  expediente: Record<string, unknown>;
  nodos: NodoVps[];
};
export const EXP_ID = String(DATOS.expediente.expedienteId);

/** La sesión tal como el portal la guarda de verdad (`shared/auth/session-storage.ts`). */
const SESION = {
  accessToken: "evidencia.sin.valor",
  tokenType: "Bearer",
  user: {
    id: "1",
    tenantId: "1",
    email: "demo@atlas.bo",
    fullName: "Analista de Operaciones",
    userCode: "OPS-1",
    status: "ACTIVE",
    mustChangePassword: false,
    mfaEnabled: true,
    roles: ["admin", "platform_admin", "risk_analyst", "internal_operator"],
    legacyRoles: [],
    // Los cinco permisos del expediente, literales: el gate del portal comprueba con `includes`,
    // no expande un comodín.
    permissions: [
      "expedientes.leer",
      "expedientes.escribir",
      "expedientes.compartir",
      "expedientes.administrar",
      "expedientes.pii.revelar",
    ],
  },
  session: { expiresAt: "2099-01-01T00:00:00.000Z" },
};

/** Un nodo del expediente con el nivel efectivo que el mapper del backend añade a la respuesta. */
function conNivel(nodo: NodoVps) {
  return {
    ...nodo,
    evidenceDocumentId: null,
    engineRequestId: null,
    borradoEn: null,
    nivelEfectivo: "administrar",
  };
}

/** El fichero real que corresponde a un nodo, por su clase. Es el mismo byte a byte que se subió. */
function bytesDe(
  nodo: NodoVps,
): { archivo: string; contentType: string } | null {
  const mapa: Record<string, { archivo: string; contentType: string }> = {
    identity_front: {
      archivo: "carnet-anverso.jpg",
      contentType: "image/jpeg",
    },
    identity_back: { archivo: "carnet-reverso.jpg", contentType: "image/jpeg" },
    selfie: { archivo: "selfie.jpg", contentType: "image/jpeg" },
    bank_statement: {
      archivo: "extracto-bancario.pdf",
      contentType: "application/pdf",
    },
  };
  return nodo.clase ? (mapa[nodo.clase] ?? null) : null;
}

export type OpcionesDelBanco = {
  /**
   * El tipo con el que el backend rotula los bytes.
   *
   * `real` es el caso feliz. `generico` reproduce lo que devuelve un objeto que se subió con un
   * PUT prefirmado sin `Content-Type`: MinIO lo guarda como `application/octet-stream`, el nodo
   * hereda ese tipo y la respuesta lo repite. La pantalla tiene que seguir abriéndolo.
   */
  contentType?: "real" | "generico";
};

export async function prepararBanco(
  page: Page,
  opciones: OpcionesDelBanco = {},
): Promise<void> {
  const generico = opciones.contentType === "generico";

  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem(
      "atlas_internal_session_v3",
      JSON.stringify(sesion),
    );
  }, SESION);

  // El comodín va PRIMERO —Playwright evalúa en orden inverso— y corta cualquier llamada de datos
  // que no interceptemos abajo: un corte de red lo maneja el portal solo, un cuerpo inventado
  // rompería la validación de contrato de algún servicio.
  await page.route("**/*", (route) => {
    const tipo = route.request().resourceType();
    return tipo === "fetch" || tipo === "xhr"
      ? route.abort()
      : route.fallback();
  });

  const noEsInterno = (pathname: string) => !pathname.startsWith("/internal");

  // La lista de expedientes: un único expediente, el real.
  await page.route(
    (url) => noEsInterno(url.pathname) && /\/expedientes$/.test(url.pathname),
    (route) =>
      route.fulfill({
        json: {
          data: {
            items: [cabeceraDelExpediente()],
            meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
          },
        },
      }),
  );

  // La cabecera del expediente.
  await page.route(
    (url) =>
      noEsInterno(url.pathname) &&
      new RegExp(`/expedientes/${EXP_ID}$`).test(url.pathname),
    (route) => route.fulfill({ json: { data: cabeceraDelExpediente() } }),
  );

  // Los hijos de una carpeta. El explorador pide por `parentId`; se responde el subconjunto real.
  await page.route(
    (url) =>
      noEsInterno(url.pathname) &&
      new RegExp(`/expedientes/${EXP_ID}/nodos$`).test(url.pathname),
    (route) => {
      const url = new URL(route.request().url());
      const parentId = url.searchParams.get("parentId");
      const q = url.searchParams.get("q");
      let nodos = DATOS.nodos;
      if (q)
        nodos = nodos.filter((n) =>
          n.nombre.toLowerCase().includes(q.toLowerCase()),
        );
      else
        nodos = nodos.filter(
          (n) => (n.parentId ?? null) === (parentId ?? null),
        );
      route.fulfill({ json: { data: nodos.map(conNivel) } });
    },
  );

  // El CONTENIDO de un archivo: los bytes reales, con su cabecera de descarga. Es lo que permite
  // que la vista previa pinte el carnet y el PDF de verdad, desde un blob, igual que en producción.
  await page.route(
    (url) =>
      noEsInterno(url.pathname) &&
      /\/nodos\/[^/]+\/contenido/.test(url.pathname),
    (route) => {
      const nodoId = /\/nodos\/([^/]+)\/contenido/.exec(
        new URL(route.request().url()).pathname,
      )?.[1];
      const nodo = DATOS.nodos.find((n) => n.nodoId === nodoId);
      const ref = nodo ? bytesDe(nodo) : null;
      if (!nodo || !ref) return route.abort();
      route.fulfill({
        status: 200,
        headers: {
          "content-type": generico
            ? "application/octet-stream"
            : ref.contentType,
          "content-disposition": `inline; filename="${nodo.nombre}"`,
        },
        body: fs.readFileSync(path.join(MATERIAL, ref.archivo)),
      });
    },
  );

  // Concesiones, visibilidad y actividad: vacías pero con forma válida, para poder abrir las
  // pestañas del panel sin que ninguna quede colgada cargando.
  await page.route(
    (url) => noEsInterno(url.pathname) && /\/visibilidad$/.test(url.pathname),
    (route) => route.fulfill({ json: { data: [] } }),
  );
  await page.route(
    (url) => noEsInterno(url.pathname) && /\/concesiones$/.test(url.pathname),
    (route) => route.fulfill({ json: { data: [] } }),
  );
  await page.route(
    (url) => noEsInterno(url.pathname) && /\/actividad$/.test(url.pathname),
    (route) =>
      route.fulfill({
        json: {
          data: {
            items: [],
            meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
          },
        },
      }),
  );
}

function cabeceraDelExpediente() {
  return {
    ...DATOS.expediente,
    nivelEfectivo: "administrar",
    nodosTotal: DATOS.nodos.filter((n) => n.tipo === "archivo").length,
    bytesTotal: String(
      DATOS.nodos.reduce((s, n) => s + Number(n.sizeBytes ?? 0), 0),
    ),
  };
}

export function capturar(page: Page, nombre: string) {
  fs.mkdirSync(OUT, { recursive: true });
  return page.screenshot({
    path: path.join(OUT, nombre),
    fullPage: true,
    animations: "disabled",
  });
}

/** El árbol lateral del expediente. Su nombre accesible es el del `<nav>` de `folder-tree.tsx`. */
export function arbol(page: Page) {
  return page.getByRole("navigation", { name: /contenido del expediente/i });
}

export async function abrirCarpeta(page: Page, nombre: string) {
  await arbol(page).getByText(nombre, { exact: true }).click();
}

/**
 * Abre un archivo desde la TABLA.
 *
 * Por el nombre a secas ya no vale: el árbol lateral también lista los archivos, así que
 * `getByRole("button", { name: "anverso.jpg" })` encuentra dos y Playwright se planta.
 */
export async function abrirArchivo(page: Page, nombre: string | RegExp) {
  await page.getByRole("table").getByRole("button", { name: nombre }).click();
}
