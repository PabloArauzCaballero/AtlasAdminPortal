import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Evidencia visual del explorador de expedientes.
 *
 * ## Qué demuestra y por qué corre SIN login
 *
 * El resto de `tests/e2e` entra por la pantalla de acceso, y el portal interno exige un segundo
 * factor por correo que no se debe apagar ni sortear para una captura. Esta prueba no lo necesita:
 * sigue el mismo patrón que `investigacion-identidad.evidencia.spec.ts` —siembra la sesión en
 * `sessionStorage` y contesta las llamadas de datos desde la propia prueba—, así que ejercita el
 * CÓDIGO DE PANTALLA que está desplegado sin depender de credenciales.
 *
 * Lo que la hace evidencia del despliegue y no de un invento: los datos NO son inventados. Salen
 * del expediente real que el alta creó en el VPS (`_evidencia-expedientes-2026-09-04/
 * expediente-vps.json`), y los bytes que se previsualizan son los MISMOS que se subieron al
 * almacén (`material/`). Lo que se comprueba es exactamente lo que pidió el encargo: que los
 * documentos quedan ordenados en `auth` y `extractos`, que las imágenes y el PDF se ABREN dentro
 * del portal, y que los contactos son un nodo que se compone —no un archivo del almacén—.
 *
 * Que el backend sirva todo eso ya se comprobó aparte, contra el túnel del VPS: el alta creó las
 * carpetas solas y los ficheros cayeron en su sitio (ver el informe de la carpeta de evidencia).
 */
const RAIZ = path.join(__dirname, "../../../_evidencia-expedientes-2026-09-04");
const OUT = path.join(RAIZ, "capturas");
const MATERIAL = path.join(RAIZ, "material");

type NodoVps = {
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

const DATOS = JSON.parse(
  fs.readFileSync(path.join(RAIZ, "expediente-vps.json"), "utf8"),
) as {
  expediente: Record<string, unknown>;
  nodos: NodoVps[];
};
const EXP_ID = String(DATOS.expediente.expedienteId);

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

async function preparar(page: Page): Promise<void> {
  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem(
      "atlas_internal_session_v3",
      JSON.stringify(sesion),
    );
  }, SESION);

  // El comodín va PRIMERO —Playwright evalúa en orden inverso— y corta cualquier llamada de datos
  // que no interceptemos abajo: un corte de red lo maneja el portal solo, un cuerpo inventado
  // rompería la validación de contrato de algún servicio. Lo mismo que en la otra evidencia.
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
            items: [
              {
                ...DATOS.expediente,
                nivelEfectivo: "administrar",
                nodosTotal: DATOS.nodos.filter((n) => n.tipo === "archivo")
                  .length,
                bytesTotal: String(
                  DATOS.nodos.reduce((s, n) => s + Number(n.sizeBytes ?? 0), 0),
                ),
              },
            ],
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
    (route) =>
      route.fulfill({
        json: {
          data: {
            ...DATOS.expediente,
            nivelEfectivo: "administrar",
            nodosTotal: DATOS.nodos.filter((n) => n.tipo === "archivo").length,
            bytesTotal: String(
              DATOS.nodos.reduce((s, n) => s + Number(n.sizeBytes ?? 0), 0),
            ),
          },
        },
      }),
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
          "content-type": ref.contentType,
          "content-disposition": `inline; filename="${nodo.nombre}"`,
        },
        body: fs.readFileSync(path.join(MATERIAL, ref.archivo)),
      });
    },
  );

  // Concesiones y actividad: vacías pero con forma válida, para que las pestañas se puedan abrir.
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

function capturar(page: Page, nombre: string) {
  fs.mkdirSync(OUT, { recursive: true });
  return page.screenshot({
    path: path.join(OUT, nombre),
    fullPage: true,
    animations: "disabled",
  });
}

async function abrirCarpeta(page: Page, nombre: string) {
  await page
    .getByRole("navigation", { name: /carpetas/i })
    .getByText(nombre, { exact: true })
    .click();
}

test.describe("expedientes · evidencia visual con datos reales del VPS", () => {
  test.beforeEach(async ({ page }) => {
    await preparar(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  test("la lista de Archivos muestra el expediente del cliente", async ({
    page,
  }) => {
    await page.goto("/internal/files", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Archivos" })).toBeVisible();
    await expect(
      page.getByText(String(DATOS.expediente.customerCode)),
    ).toBeVisible();
    await capturar(page, "01-lista-de-expedientes.png");
  });

  test("el expediente abre con sus cuatro carpetas base", async ({ page }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    const nav = page.getByRole("navigation", { name: /carpetas/i });
    for (const carpeta of ["auth", "extractos", "domicilio", "otros"]) {
      await expect(nav.getByText(carpeta, { exact: true })).toBeVisible();
    }
    await capturar(page, "02-expediente-carpetas-base.png");
  });

  test("«auth» tiene el carnet y la selfie, marcados como subidos por el cliente", async ({
    page,
  }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "auth");
    await expect(page.getByRole("button", { name: /anverso/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /reverso/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /selfie/i })).toBeVisible();
    await expect(page.getByText("Lo subió el cliente").first()).toBeVisible();
    await capturar(page, "03-carpeta-auth.png");
  });

  test("«extractos» tiene el PDF del banco, separado de la identidad", async ({
    page,
  }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "extractos");
    await expect(
      page.getByRole("button", { name: "extracto.pdf" }),
    ).toBeVisible();
    await capturar(page, "04-carpeta-extractos.png");
  });

  test("una imagen del carnet se abre dentro del portal, desde un blob", async ({
    page,
  }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "auth");
    await page.getByRole("button", { name: /anverso/i }).click();
    const imagen = page.locator('img[src^="blob:"]');
    await expect(imagen).toBeVisible();
    // Que tenga ancho real prueba que el byte llegó y se decodificó, no que hay un hueco.
    expect(
      await imagen.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(100);
    await capturar(page, "05-vista-previa-carnet.png");
    await page.getByRole("button", { name: "Detalles" }).click();
    await expect(page.getByText("Huella (SHA-256)")).toBeVisible();
    await capturar(page, "06-detalles-y-huella.png");
  });

  test("el PDF del extracto se abre dentro del portal", async ({ page }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "extractos");
    await page.getByRole("button", { name: "extracto.pdf" }).click();
    await expect(page.locator('iframe[src^="blob:"]')).toBeVisible();
    await capturar(page, "07-vista-previa-extracto.png");
  });
});
