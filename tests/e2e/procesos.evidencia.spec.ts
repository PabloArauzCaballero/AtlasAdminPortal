import { expect, test, type Page } from "@playwright/test";
import { quietaParaCapturar } from "./estabilizar";
import { clickAndNavigate } from "./evidence";

/** Fuera de `test-results/`: Playwright la vacía en cada corrida. */
const SALIDA = process.env.PROCESOS_SHOTS ?? "test-results/procesos";

/**
 * Evidencia visual de la sección Procesos (`/internal/procesos`).
 *
 * Como la de soporte, corre sin login y sin backend: siembra la sesión en `sessionStorage` (el
 * portal tiene que servirse con `NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=session`) y contesta las
 * llamadas desde la propia prueba con la forma exacta de `internal/processes` en AtlasBackend. Lo
 * que se mide es el CÓDIGO DE PANTALLA: que el menú, la tabla, la ficha y los casos pinten lo que
 * la API devuelve. Que la API devuelva lo que debe se prueba en el backend.
 */
const SESION = {
  accessToken: "evidencia.sin.valor",
  tokenType: "Bearer",
  user: {
    id: "1",
    tenantId: "1",
    email: "demo@atlas.bo",
    fullName: "Operador Interno",
    userCode: "OPS-1",
    status: "ACTIVE",
    mustChangePassword: false,
    mfaEnabled: true,
    roles: ["OPERATIONS_MANAGER"],
    legacyRoles: ["internal_operator"],
    permissions: ["workflows.read"],
  },
  session: { expiresAt: "2099-01-01T00:00:00.000Z" },
};

const DOC = {
  narrative: true,
  owner: true,
  instanceEntity: true,
  screens: true,
  inDatabase: true,
  complete: true,
  syncedAt: "2026-09-26T10:00:00.000Z",
};

const LISTA = {
  totals: { processes: 2, documented: 1, fullyWired: 1, unwiredSteps: 1 },
  items: [
    {
      processId: "P-01",
      code: "account_signup_to_login",
      name: "Alta de cuenta: de la primera pantalla a la sesión iniciada",
      description: "Textos legales, alta, verificación de contacto y login.",
      processType: "customer_journey",
      priority: "P0",
      ownerRole: "OPERATIONS_MANAGER",
      systems: ["ATLAS_BACKEND"],
      clients: ["CONSUMER_APP", "ADMIN_PORTAL", "BLOCK"],
      stageCount: 2,
      stepCount: 3,
      documentation: { ...DOC, screens: false, complete: false },
      wiring: { wired: 1, unwired: 1, unknown: 0, personSteps: 2 },
      hasInstances: true,
    },
    {
      processId: "P-16",
      code: "partner_onboarding",
      name: "Alta de comercio",
      description: "El ERP pide, el Motor decide y el portal concede.",
      processType: "partner_journey",
      priority: "P1",
      ownerRole: "OPERATIONS_MANAGER",
      systems: ["ATLAS_BACKEND", "ERP_BACKEND"],
      clients: ["ERP_PORTAL", "ADMIN_PORTAL"],
      stageCount: 3,
      stepCount: 6,
      documentation: DOC,
      wiring: { wired: 3, unwired: 0, unknown: 0, personSteps: 3 },
      hasInstances: false,
    },
  ],
};

const RESPUESTA =
  "Una respuesta con el largo mínimo que exige la comprobación de narrativa del proceso.";
const PASO = {
  kind: "http",
  system: "ATLAS_BACKEND",
  verification: "VERIFIED",
  risk: "MEDIUM",
};
const FICHA = {
  ...LISTA.items[0],
  version: "v1",
  ownerDomain: "customer_onboarding",
  narrative: {
    whyExists: `Sin cuenta verificada no hay cliente. ${RESPUESTA}`,
    whoStartsAndCloses: `Lo empieza el cliente en la app. ${RESPUESTA}`,
    startAndEnd: `Empieza con el registro y termina con la sesión. ${RESPUESTA}`,
    whenItFails: `El cliente queda en «registrado». ${RESPUESTA}`,
    healthIndicator: `Registros que verifican contacto en 24 h. ${RESPUESTA}`,
  },
  instanceEntity: {
    system: "ATLAS_BACKEND",
    schema: "customer",
    table: "customers",
    idColumn: "_id",
    statusColumn: "lifecycle_status",
  },
  success:
    "El cliente existe, tiene contacto verificado y una sesión iniciada.",
  failure: "El alta queda sin contacto verificado o el login se bloquea.",
  sources: ["docs/onboarding-flujo-corregido.md"],
  codeHash: "0123456789abcdef",
  databaseHash: "0123456789abcdef",
  stages: [
    {
      code: "signup",
      name: "Registro en la app",
      description: "La persona crea su cuenta desde la app.",
      module: "customer-onboarding",
      actor: "customer",
      client: "CONSUMER_APP",
      steps: [
        {
          ...PASO,
          code: "start",
          name: "Crear la cuenta",
          description: "Envía sus datos y acepta los textos legales.",
          method: "POST",
          path: "/customer-onboarding/start",
          wiring: "not_applicable",
          flowId: "flow_aaaaaaaaaaaa",
          callers: ["CONSUMER_APP"],
        },
      ],
    },
    {
      code: "contacts",
      name: "Contactos pendientes",
      description: "El equipo reenvía los códigos que no llegaron.",
      module: "operations",
      actor: "internal_user",
      client: "ADMIN_PORTAL",
      screen: "/internal/operations/pending-contacts",
      steps: [
        {
          ...PASO,
          code: "resend",
          name: "Reenviar el código",
          description: "Manda otra vez el código al correo o al teléfono.",
          method: "POST",
          path: "/customer-onboarding/:id/contact-verification/request",
          wiring: "wired",
          flowId: "flow_bbbbbbbbbbbb",
          callers: ["ADMIN_PORTAL"],
        },
        {
          ...PASO,
          code: "discard",
          name: "Descartar un contacto",
          description:
            "Marca un contacto como inválido para que no se reintente.",
          method: "PATCH",
          path: "/operations/customers/:id/contact-methods/:contactId",
          wiring: "unwired",
          flowId: "flow_cccccccccccc",
          callers: [],
        },
      ],
    },
  ],
};

const CABLEADO = {
  code: "account_signup_to_login",
  summary: LISTA.items[0]?.wiring,
  steps: [
    {
      stageCode: "contacts",
      stageName: "Contactos pendientes",
      client: "ADMIN_PORTAL",
      screen: "/internal/operations/pending-contacts",
      stepCode: "discard",
      stepName: "Descartar un contacto",
      method: "PATCH",
      path: "/operations/customers/:id/contact-methods/:contactId",
      system: "ATLAS_BACKEND",
      wiring: "unwired",
      callers: [],
      flowId: "flow_cccccccccccc",
    },
  ],
};

const CASOS = {
  supported: true,
  entity: FICHA.instanceEntity,
  byStatus: [
    { status: "registered", total: 12, open: true },
    { status: "active", total: 87, open: false },
  ],
  items: [
    { id: "9001", label: "CUS-9001", status: "registered", open: true },
    { id: "9000", label: "CUS-9000", status: "active", open: false },
  ],
  total: 2,
  page: 1,
  pageSize: 25,
};

const AVANCE = {
  code: "account_signup_to_login",
  instance: { id: "9001", label: "CUS-9001", status: "registered" },
  stages: [
    { ...FICHA.stages[0], screen: null, link: null, state: "reached" },
    {
      ...FICHA.stages[1],
      screen: "/internal/operations/pending-contacts",
      link: null,
      state: "current",
    },
  ],
};

type Ruta = readonly [RegExp, unknown];
const RUTAS: readonly Ruta[] = [
  [/\/internal\/processes$/, LISTA],
  [/\/internal\/processes\/account_signup_to_login$/, FICHA],
  [/\/internal\/processes\/account_signup_to_login\/wiring$/, CABLEADO],
  [/\/internal\/processes\/account_signup_to_login\/instances$/, CASOS],
  [/\/instances\/9001\/progress$/, AVANCE],
];

async function preparar(page: Page, sesion = SESION): Promise<void> {
  await page.addInitScript((s) => {
    window.sessionStorage.setItem(
      "atlas_internal_session_v3",
      JSON.stringify(s),
    );
  }, sesion);
  // Primero el comodín: Playwright evalúa las rutas en orden inverso.
  await page.route("**/api/v1/**", (route) => route.abort());
  for (const [patron, json] of RUTAS) {
    await page.route(
      (url) => url.pathname.startsWith("/api/v1") && patron.test(url.pathname),
      (route) => route.fulfill({ json: { data: json } }),
    );
  }
}

async function capturar(page: Page, nombre: string): Promise<void> {
  await quietaParaCapturar(page);
  await page
    .addStyleTag({ content: "nextjs-portal{display:none!important}" })
    .catch(() => undefined);
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("Procesos — el menú y el listado con sus cifras", async ({ page }) => {
  await preparar(page);
  await page.goto("/internal/procesos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Procesos de Atlas",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("link", { name: "Procesos", exact: true }),
  ).toBeVisible();
  const cifra = page.getByRole("button", { name: /^Pasos sin pantalla/ });
  await expect(cifra).toBeVisible();
  const fila = page.getByRole("row", { name: /Alta de cuenta/ });
  await expect(fila.getByText("1 sin pantalla")).toBeVisible();
  await capturar(page, "listado");

  await cifra.click();
  await expect(page.getByRole("row", { name: /Alta de comercio/ })).toHaveCount(
    0,
  );
  await capturar(page, "listado-filtrado-sin-pantalla");
});

test("Procesos — la ficha destaca los pasos sin pantalla", async ({ page }) => {
  await preparar(page);
  await page.goto("/internal/procesos", { waitUntil: "domcontentloaded" });
  await clickAndNavigate(
    page,
    page
      .getByRole("row", { name: /Alta de cuenta/ })
      .getByRole("link", { name: "Ver ficha" }),
    /\/internal\/procesos\/account_signup_to_login$/,
    "la ficha del proceso no abrió tras el clic",
  );
  // Resumen es la pestaña por defecto; los pasos sin pantalla viven en «Documentación y cableado».
  await expect(page.getByText("¿Qué pasa cuando falla?")).toBeVisible();
  await page.getByRole("button", { name: "Documentación y cableado" }).click();
  await expect(page.getByRole("status")).toContainText("1 paso sin pantalla");
  await page.getByRole("button", { name: "Pasos y flujos" }).click();
  // «Pasos y flujos» es una tabla con una fila por paso; la pantalla de la etapa va en su columna.
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ has: page.getByTestId("etapa-contacts") })
      .first()
      .getByRole("link", { name: /abrir la pantalla/i }),
  ).toHaveAttribute("href", "/internal/operations/pending-contacts");
  await capturar(page, "ficha");
});

test("Procesos — casos en curso y avance de uno", async ({ page }) => {
  await preparar(page);
  // La ruta vieja `/instancias` redirige a la pestaña «Casos en curso» de la ficha.
  await page.goto("/internal/procesos/account_signup_to_login/instancias", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(
    /\/internal\/procesos\/account_signup_to_login\?tab=casos$/,
  );
  await expect(page.getByLabel("Casos por estado")).toContainText("12", {
    timeout: 30_000,
  });
  await clickAndNavigate(
    page,
    page.getByRole("button", { name: "Ver avance" }).first(),
    /caso=9001/,
    "el avance del caso no abrió tras el clic",
  );
  await expect(page.getByTestId("avance-del-caso")).toContainText("Está aquí");
  await capturar(page, "casos-y-avance");
});

test("Procesos — sin workflows.read, ni menú ni datos", async ({ page }) => {
  await preparar(page, {
    ...SESION,
    user: { ...SESION.user, permissions: ["systems.flows.read"] },
  });
  await page.goto("/internal/procesos", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Acceso restringido")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("link", { name: "Procesos", exact: true }),
  ).toHaveCount(0);
});
