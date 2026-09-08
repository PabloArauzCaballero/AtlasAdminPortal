import { expect, test, type Page } from "@playwright/test";

/** Fuera de `test-results/`: Playwright la vacía en cada corrida. */
const SALIDA = process.env.PROVEEDORES_SHOTS ?? "test-results/proveedores-externos";

/**
 * Evidencia visual de Proveedores externos: el tablero de actividad, la tabla con las etiquetas
 * corregidas, las auditorías legibles y el listado de solicitudes.
 *
 * Corre sin login y sin backend: siembra la sesión y contesta las llamadas desde la prueba.
 *
 * Lo que estas pruebas fijan, además de servir de evidencia:
 *
 *  - Un proveedor en modo simulado local NO puede decir «Responde» ni «0 ms». El backend devuelve
 *    `UP`/`0 ms` como constante en ese modo, sin llamar a nadie, y pintarlo tal cual afirmaba una
 *    medición que nunca ocurrió.
 *  - Las auditorías NO se pintan como un bloque de JSON. El JSON sigue disponible, plegado.
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
    roles: ["admin", "platform_admin", "internal_operator"],
    legacyRoles: [],
    permissions: [],
  },
  session: { expiresAt: "2099-01-01T00:00:00.000Z" },
};

const AHORA = "2026-09-08T15:00:00.000Z";

function serie(base: number, puntos: number) {
  return Array.from({ length: puntos }, (_, index) => ({
    status: "UP",
    latencyMs: Math.round(base + Math.sin(index / 2) * base * 0.25),
    checkedAt: new Date(Date.parse(AHORA) - (puntos - index) * 60_000).toISOString(),
  }));
}

const PROVEEDORES = [
  {
    id: "1",
    code: "SEGIP",
    name: "SEGIP / CGIP Identity Verification",
    category: "IDENTITY",
    status: "ACTIVE",
    defaultMode: "mock_server",
    requiresConsent: true,
    requiresManualApproval: false,
    isCostly: false,
    description: null,
  },
  {
    id: "2",
    code: "INFOCENTER",
    name: "InfoCenter Credit Bureau",
    category: "CREDIT_BUREAU",
    status: "ACTIVE",
    defaultMode: "mock_server",
    requiresConsent: true,
    requiresManualApproval: true,
    isCostly: true,
    description: null,
  },
  {
    id: "3",
    code: "WHATSAPP_GENERIC",
    name: "WhatsApp Generic Contactability Provider",
    category: "MESSAGING",
    status: "MOCK_ONLY",
    // El caso que importa: modo simulado local. No debe decir «Responde · 0 ms».
    defaultMode: "mock_local",
    requiresConsent: true,
    requiresManualApproval: false,
    isCostly: false,
    description: null,
  },
];

const SALUD = [
  { providerCode: "SEGIP", status: "UP", mode: "mock_server", latencyMs: 812, checkedAt: AHORA },
  { providerCode: "INFOCENTER", status: "DEGRADED", mode: "mock_server", latencyMs: 2410, checkedAt: AHORA },
  { providerCode: "WHATSAPP_GENERIC", status: "UP", mode: "mock_local", latencyMs: 0, checkedAt: AHORA },
];

const TABLERO = {
  generatedAt: AHORA,
  days: 1,
  windowFrom: "2026-09-07T15:00:00.000Z",
  totals: {
    providers: 3,
    respondingProviders: 2,
    unmeasuredProviders: 0,
    totalCalls: 151,
    successCalls: 142,
    failedCalls: 6,
    blockedCalls: 3,
    successRate: 94.04,
    worstP95LatencyMs: 2410,
    estimatedCost: 184,
    actualCost: 161.5,
  },
  providers: [
    {
      providerCode: "SEGIP",
      name: "SEGIP / CGIP Identity Verification",
      category: "IDENTITY",
      status: "ACTIVE",
      mode: "mock_server",
      isCostly: false,
      requiresManualApproval: false,
      health: { status: "UP", latencyMs: 812, checkedAt: AHORA, modeChecked: "mock_server", errorCode: null, errorMessageSafe: null },
      healthSeries: serie(800, 24),
      activity: {
        total: 128,
        success: 126,
        failed: 2,
        blocked: 0,
        cached: 0,
        successRate: 98.44,
        p95LatencyMs: 1320,
        avgLatencyMs: 870,
        estimatedCost: 0,
        actualCost: 0,
        lastRequestAt: "2026-09-08T14:58:00.000Z",
        lastErrorStatus: null,
        lastErrorMessage: null,
      },
    },
    {
      providerCode: "INFOCENTER",
      name: "InfoCenter Credit Bureau",
      category: "CREDIT_BUREAU",
      status: "ACTIVE",
      mode: "mock_server",
      isCostly: true,
      requiresManualApproval: true,
      health: {
        status: "DEGRADED",
        latencyMs: 2410,
        checkedAt: AHORA,
        modeChecked: "mock_server",
        errorCode: null,
        errorMessageSafe: null,
      },
      healthSeries: serie(1800, 24),
      activity: {
        total: 23,
        success: 20,
        failed: 3,
        blocked: 3,
        cached: 0,
        successRate: 86.96,
        p95LatencyMs: 2410,
        avgLatencyMs: 1640,
        estimatedCost: 184,
        actualCost: 161.5,
        lastRequestAt: "2026-09-08T14:42:00.000Z",
        lastErrorStatus: "PROVIDER_UNAVAILABLE",
        lastErrorMessage: "El proveedor no respondió dentro del plazo.",
      },
    },
    {
      providerCode: "WHATSAPP_GENERIC",
      name: "WhatsApp Generic Contactability Provider",
      category: "MESSAGING",
      status: "MOCK_ONLY",
      mode: "mock_local",
      isCostly: false,
      requiresManualApproval: false,
      health: { status: "UP", latencyMs: 0, checkedAt: AHORA, modeChecked: "mock_local", errorCode: null, errorMessageSafe: null },
      healthSeries: [],
      activity: {
        total: 0,
        success: 0,
        failed: 0,
        blocked: 0,
        cached: 0,
        successRate: null,
        p95LatencyMs: null,
        avgLatencyMs: null,
        estimatedCost: 0,
        actualCost: 0,
        lastRequestAt: null,
        lastErrorStatus: null,
        lastErrorMessage: null,
      },
    },
  ],
  recentRequests: [
    {
      requestId: "4021",
      providerCode: "SEGIP",
      customerId: "318",
      requestType: "IDENTITY_VERIFICATION",
      purposeCode: "KYC_ONBOARDING",
      decisionStage: "ONBOARDING",
      modeUsed: "mock_server",
      responseStatus: "MOCKED",
      responseCode: null,
      approvalStatus: null,
      latencyMs: 940,
      estimatedCostAmount: null,
      actualCostAmount: null,
      currency: null,
      errorMessageSafe: null,
      requestedAt: "2026-09-08T14:58:00.000Z",
      respondedAt: "2026-09-08T14:58:01.000Z",
    },
    {
      requestId: "4018",
      providerCode: "INFOCENTER",
      customerId: "318",
      requestType: "CREDIT_CHECK",
      purposeCode: "CREDIT_EVALUATION",
      decisionStage: "UNDERWRITING",
      modeUsed: "mock_server",
      responseStatus: "PROVIDER_UNAVAILABLE",
      responseCode: null,
      approvalStatus: null,
      latencyMs: 8000,
      estimatedCostAmount: 8,
      actualCostAmount: null,
      currency: "BOB",
      errorMessageSafe: "El proveedor no respondió dentro del plazo.",
      requestedAt: "2026-09-08T14:42:00.000Z",
      respondedAt: null,
    },
    {
      requestId: "4015",
      providerCode: "INFOCENTER",
      customerId: "290",
      requestType: "CREDIT_CHECK",
      purposeCode: "CREDIT_EVALUATION",
      decisionStage: "UNDERWRITING",
      modeUsed: "mock_server",
      responseStatus: "BLOCKED_BY_COST_POLICY",
      responseCode: "INFOCENTER_HIGH_COST_REQUIRES_MANUAL_APPROVAL",
      approvalStatus: "PENDING",
      latencyMs: null,
      estimatedCostAmount: 8,
      actualCostAmount: null,
      currency: "BOB",
      errorMessageSafe: null,
      requestedAt: "2026-09-08T14:10:00.000Z",
      respondedAt: null,
    },
  ],
};

const CALIDAD = {
  generatedAt: AHORA,
  score: 63,
  rating: "D",
  findings: [
    {
      severity: "CRITICAL",
      providerCode: "INFOCENTER",
      code: "PRODUCTION_INTEGRATION_GATE_BLOCKED",
      message: "Producción bloqueada: INFOCENTER_REAL_INTEGRATION_NOT_IMPLEMENTED.",
    },
    {
      severity: "HIGH",
      providerCode: "WHATSAPP_GENERIC",
      code: "ADAPTER_MISSING",
      message: "Provider configurado sin adapter registrado.",
    },
    {
      severity: "MEDIUM",
      providerCode: "SEGIP",
      code: "POLICY_WITHOUT_ALLOWED_STAGES",
      message: "Query IDENTITY_VERIFICATION no define etapas permitidas.",
    },
  ],
  qualityGates: {
    canEnableProductionProviders: false,
    canRunCostlyProvidersAutomatically: false,
    scoringProviderCouplingAllowed: false,
  },
};

const SOLICITUDES = {
  generatedAt: AHORA,
  total: 3,
  limit: 25,
  offset: 0,
  requests: TABLERO.recentRequests,
};

type Ruta = readonly [RegExp, unknown];

async function preparar(page: Page, rutas: readonly Ruta[]): Promise<void> {
  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem("atlas_internal_session_v3", JSON.stringify(sesion));
  }, SESION);

  // Sólo `/api/v1`: con el comodín sobre todo, `next dev` pierde sus cargas RSC y la navegación
  // muere antes de llegar a la pantalla. Va primero porque Playwright evalúa en orden inverso.
  await page.route("**/api/v1/**", (route) => route.abort());

  for (const [patron, json] of rutas) {
    await page.route(
      (url) => url.pathname.startsWith("/api/v1") && patron.test(url.pathname),
      (route) => route.fulfill({ json: { data: json } }),
    );
  }
}

async function capturar(page: Page, nombre: string): Promise<void> {
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => undefined);
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true });
}

const RUTAS_BASE: readonly Ruta[] = [
  [/\/admin\/external-providers$/, PROVEEDORES],
  [/\/admin\/external-providers\/health$/, SALUD],
  [/\/admin\/external-providers\/dashboard$/, TABLERO],
  [/\/admin\/external-providers\/requests$/, SOLICITUDES],
  [/\/admin\/external-providers\/auth-broker\/availability$/, { configured: false, reachable: false }],
];

test("Proveedores externos — tablero de actividad y catálogo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparar(page, RUTAS_BASE);
  await page.goto("/internal/external-providers", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Proveedores externos" })).toBeVisible();
  // El tablero abre la pantalla.
  await expect(page.getByText("Responden", { exact: true })).toBeVisible();
  await expect(page.getByText("7 días", { exact: true })).toBeVisible();

  /*
   * La invariante de esta pantalla: un proveedor en modo simulado local no puede afirmar que
   * responde. El backend devuelve `UP` y `0 ms` sin haber llamado a nadie.
   */
  const tarjetaWhatsapp = page
    .locator("div")
    .filter({ hasText: /^WHATSAPP_GENERIC/ })
    .first();
  await expect(tarjetaWhatsapp.getByText("Sin llamada")).toBeVisible();

  /*
   * La tabla no puede expulsar columnas fuera de la pantalla. `DataTable` dimensiona por
   * contenido y NO recorta, así que una columna de más manda las últimas fuera del viewport y la
   * columna clavada de la derecha se pinta encima de la anterior. Pasó al alargar dos cabeceras:
   * «Estado» → «Tipo de proveedor» empujó tres columnas afuera. Se resolvió fusionando las que
   * miden lo mismo, no ajustando anchos —eso vuelve a romperse con la siguiente columna—.
   */
  const anchoVentana = page.viewportSize()?.width ?? 1440;
  // La ÚLTIMA tabla de la página es la del catálogo; la primera es «Últimas llamadas», que también
  // tiene una cabecera «Proveedor».
  const catalogo = page.locator("table").last();
  for (const cabecera of ["Proveedor", "Tipo de proveedor", "Cómo se le llama", "Salud", "Autenticación", "Política", "Detalle"]) {
    const celda = catalogo.getByRole("columnheader", { name: cabecera, exact: true });
    await expect(celda).toBeVisible();
    // `toBeVisible` sólo exige que esté en el DOM con caja no vacía: una columna empujada fuera
    // del viewport la pasa igual. Lo que hay que medir es que su borde derecho entre en pantalla.
    const caja = await celda.boundingBox();
    expect(caja, `«${cabecera}» no tiene caja`).not.toBeNull();
    expect(
      (caja?.x ?? 0) + (caja?.width ?? 0),
      `La columna «${cabecera}» se sale de la pantalla: sobran columnas en la tabla.`,
    ).toBeLessThanOrEqual(anchoVentana);
  }

  await capturar(page, "01-tablero-y-catalogo");
});

test("Proveedores externos — la auditoría de configuración se lee sin JSON", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparar(page, [...RUTAS_BASE, [/\/admin\/external-providers\/quality-audit$/, CALIDAD]]);
  await page.goto("/internal/external-providers/audits", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Auditorías y diagnóstico" })).toBeVisible();

  // Los hallazgos se leen en castellano, con su gravedad y qué hacer.
  await expect(page.getByText("No puede pasar a producción").first()).toBeVisible();
  await expect(page.getByText("Sin conector").first()).toBeVisible();
  await expect(page.getByText("Crítico").first()).toBeVisible();

  // El JSON sigue disponible, pero PLEGADO: no es lo primero que se ve.
  await expect(page.getByRole("button", { name: "Ver datos crudos" })).toBeVisible();

  await capturar(page, "02-auditoria-configuracion");
});

test("Proveedores externos — el listado de solicitudes existe", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparar(page, RUTAS_BASE);
  await page.goto("/internal/external-providers/requests", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Solicitudes a proveedores" })).toBeVisible();
  // Sin listado, estas cuatro acciones pedían el identificador de memoria.
  await expect(page.getByText("4021")).toBeVisible();
  await expect(page.getByText("Proveedor caído").first()).toBeVisible();
  await expect(page.getByText("Bloqueada por costo").first()).toBeVisible();

  await capturar(page, "03-listado-de-solicitudes");
});
