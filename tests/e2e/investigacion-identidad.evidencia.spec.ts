import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Evidencia visual: identidad y agenda en la investigación de un caso.
 *
 * ## Por qué esta corre SIN el stack real, a diferencia del resto de `tests/e2e`
 *
 * Las demás entran por la pantalla de acceso con credenciales de `.env.local` y miden el portal
 * contra los datos que haya en la base. Ésta no puede: lo que hay que enseñar es un cliente con una
 * verificación de identidad resuelta Y un snapshot de agenda cruzado, y sembrar ese estado exige
 * recorrer el alta entera —tres fotos, el motor de decisión, el cruce de hashes— desde una prueba
 * de interfaz. Una evidencia que depende de eso se pone roja por el motivo equivocado nueve de cada
 * diez veces.
 *
 * Así que el expediente llega doblado y la sesión se siembra en `sessionStorage`, que es donde el
 * portal la guarda de verdad (`shared/auth/session-storage.ts`). Lo que esto demuestra es lo que
 * tiene que demostrar: **que la pantalla enseña las dos secciones nuevas y que distingue una agenda
 * NO COMPARTIDA de una agenda vacía**. Que el backend las sirva lo prueban sus propias pruebas.
 *
 * ## Por qué no se salta cuando faltan credenciales
 *
 * Porque no las usa. El resto de la suite se salta sin `TEST_EMAIL`, y eso está bien para lo que
 * mide; ésta correría igual en una máquina limpia, que es exactamente lo que se quiere de una
 * evidencia de interfaz.
 */

const OUT = "test-results/evidencia/investigacion-identidad";
const CUSTOMER_ID = "900";

/** La sesión tal como el portal la guarda. Sin `accessToken` sería una sesión por cookie. */
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
    permissions: ["*"],
  },
  session: { expiresAt: "2099-01-01T00:00:00.000Z" },
};

/**
 * El expediente, con las dos secciones nuevas rellenas.
 *
 * Los nombres de campo son los que emite `operations.mapper.ts` de AtlasBackend. Si allí se
 * renombrara alguno sin tocarlo aquí, esta prueba se pondría en rojo — que es lo que debe pasar: la
 * pantalla dejaría de enseñar ese dato y nadie se enteraría.
 */
const EXPEDIENTE = {
  customer: {
    customerId: CUSTOMER_ID,
    customerCode: "CLI-900",
    status: "under_review",
    phoneLast4: "0122",
    emailDomain: "gmail.com",
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  profile: {
    firstName: "María",
    lastName: "Rodríguez",
    birthDate: "2003-04-05",
    preferredLanguage: "es",
  },
  contacts: [
    { contactType: "phone", status: "verified", isPrimary: true, valueLast4: "0122" },
  ],
  consents: [
    { purposeCode: "identity_verification", granted: true, grantedAt: "2026-08-01T10:05:00.000Z", revokedAt: null },
  ],
  latestRiskAssessment: null,
  manualReviewCases: [
    { caseId: "77", caseCode: "MR-IDENT-0042", caseType: "identity", priority: "10", status: "open", openedAt: "2026-08-26T12:00:00.000Z" },
  ],
  fraudCases: [],
  latestIdentityVerification: {
    attemptId: "5501",
    channel: "MOBILE_APP",
    result: "IN_REVIEW",
    similarity: 0.883,
    fraudRisk: 0.68,
    requestedAt: "2026-08-26T12:00:00.000Z",
    completedAt: "2026-08-26T12:00:12.000Z",
  },
  addressBook: {
    available: true,
    totalContacts: 180,
    uniqueRatio: 0.94,
    bolivianRatio: 0.86,
    referencesFoundInAddressBook: 2,
    riskMatches: 1,
  },
};

async function preparar(page: Page, expediente: unknown): Promise<void> {
  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem("atlas_internal_session_v3", JSON.stringify(sesion));
  }, SESION);

  /*
   * EL ORDEN IMPORTA, y al revés de lo que parece.
   *
   * Playwright prueba los manejadores en orden INVERSO al de registro: el último que se declara es
   * el primero que se consulta. Con el comodín declarado al final, se comía también la llamada al
   * expediente y la pantalla salía con «No se pudo conectar con el servicio interno» — la evidencia
   * enseñaba el estado de error en vez de las dos secciones.
   *
   * Así que el comodín va PRIMERO y el específico después, que es el que gana.
   */
  /*
   * Cualquier OTRA llamada de datos se CORTA, no se contesta con un cuerpo inventado.
   *
   * Se probó lo contrario —devolver `{ data: { items: [], total: 0 } }` a todo— y tumbaba la
   * pantalla entera: varios servicios validan la respuesta contra su contrato de Zod, y una forma
   * que no encaja lanza `ApiContractError`, que sube hasta el límite de error del segmento. La
   * evidencia salía siendo «Ocurrió un error inesperado en esta sección».
   *
   * Un corte de red, en cambio, es un fallo que el portal SABE manejar: cada consulta lo trata por
   * su cuenta y el resto de la pantalla sigue en pie. Es además lo honesto — no hay backend en esta
   * corrida, y decirlo con un error de red es más veraz que inventar un cuerpo vacío.
   */
  await page.route("**/*", (route) => {
    const tipo = route.request().resourceType();
    if (tipo !== "fetch" && tipo !== "xhr") return route.fallback();
    return route.abort();
  });

  /*
   * El intercepto se decide con un PREDICADO y no con un comodín de ruta, y el motivo se pagó una
   * vez: la pantalla del portal vive en `/internal/operations/customers/900/investigation-summary`
   * y la llamada al backend, en `/operations/customers/900/investigation-summary`. Un
   * comodín con `operations/customers` en medio casa con LAS DOS, así que Playwright respondía el
   * JSON a la NAVEGACIÓN y el navegador enseñaba el JSON en crudo en vez del portal.
   *
   * Dos condiciones lo separan: que no sea una navegación de documento —una pantalla nunca es una
   * llamada de datos— y que la ruta no empiece por `/internal`, que es el prefijo del portal.
   */
  await page.route(
    (url) =>
      !url.pathname.startsWith("/internal") &&
      /\/operations\/customers\/[^/]+\/investigation-summary$/.test(url.pathname),
    (route) => {
      if (route.request().resourceType() === "document") return route.fallback();
      return route.fulfill({ json: { data: expediente } });
    },
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

test.describe("investigación · identidad y agenda", () => {
  test("enseña la verificación y la forma de la agenda", async ({ page }) => {
    await preparar(page, EXPEDIENTE);
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.goto(
      `/internal/operations/customers/${CUSTOMER_ID}/investigation-summary`,
      { waitUntil: "domcontentloaded" },
    );

    await expect(
      page.getByRole("heading", { name: "Verificación de identidad" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Riesgo de fraude documental")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Agenda del dispositivo" }),
    ).toBeVisible();
    await expect(
      page.getByText("Coincidencias con teléfonos ya marcados"),
    ).toBeVisible();

    await capturar(page, "01-identidad-y-agenda.png");
  });

  test("una agenda NO COMPARTIDA no se lee como una agenda vacía", async ({ page }) => {
    /*
     * La afirmación que hace honesta a la pantalla. Negarse a dar el permiso de contactos es un
     * derecho, no una señal de fraude, y las dos situaciones tienen el mismo cero. Enseñarlas igual
     * invitaría a leer una decisión legítima como sospechosa — y diría lo contrario que el
     * artefacto, que pondera la ausencia con veinte puntos de cien.
     */
    await preparar(page, {
      ...EXPEDIENTE,
      addressBook: {
        available: false,
        totalContacts: 0,
        uniqueRatio: 0,
        bolivianRatio: 0,
        referencesFoundInAddressBook: 0,
        riskMatches: 0,
      },
    });
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.goto(
      `/internal/operations/customers/${CUSTOMER_ID}/investigation-summary`,
      { waitUntil: "domcontentloaded" },
    );

    await expect(
      page.getByText(/No compartida — la persona no dio el permiso/),
    ).toBeVisible({ timeout: 30_000 });
    // Y ninguna cifra de una agenda que nadie midió.
    await expect(
      page.getByText("Coincidencias con teléfonos ya marcados"),
    ).toBeHidden();

    await capturar(page, "02-agenda-no-compartida.png");
  });
});
