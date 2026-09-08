import { expect, test, type Page } from "@playwright/test";

/** Fuera de `test-results/`: Playwright la vacía en cada corrida. */
const SALIDA = process.env.SOPORTE_SHOTS ?? "test-results/soporte";

/**
 * Evidencia visual de la consola de soporte del portal interno.
 *
 * Corre sin login y sin backend: siembra la sesión en `sessionStorage` y contesta las llamadas
 * desde la propia prueba. Lo que se mide es el CÓDIGO DE PANTALLA, no el stack.
 *
 * La última prueba es la que más importa: comprueba que un 403 `SUPPORT_AGENT_PROFILE_REQUIRED`
 * —el error que recibía cualquier administrador antes de que existiera el alta de agentes— se lea
 * como «te falta un perfil, habilítalo aquí» y no como una pantalla rota o una cola vacía.
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

const CASOS = {
  cases: [
    {
      caseId: "5001",
      caseNumber: "SUP-2026-000481",
      title: "No me reconocen el pago de la cuota 3",
      caseType: "PAYMENT_EVIDENCE",
      domain: "PAYMENT",
      status: "IN_PROGRESS",
      customerStatus: "Estamos trabajando",
      openedAt: "2026-09-05T14:12:00.000Z",
      lastActivityAt: "2026-09-07T09:02:00.000Z",
      resolvedAt: null,
      closedAt: null,
      internalStatus: "IN_PROGRESS",
      priority: "P2",
      impact: "INDIVIDUAL",
      urgency: "HIGH",
      sensitivity: "NORMAL",
      queueId: "2",
      categoryId: "18",
      assigneeAgentId: "4",
      subjectContextType: "CONSUMER",
      subjectCustomerId: "9001",
      subjectPartnerProfileId: null,
      internalSummary: "El comprobante existe y no está conciliado.",
      escalationLevel: 0,
      transferCount: 1,
      legalHold: false,
      retentionClassCode: "STANDARD",
      originContext: null,
    },
    {
      caseId: "5002",
      caseNumber: "SUP-2026-000482",
      title: "No recibo el código de acceso",
      caseType: "ACCOUNT_ACCESS",
      domain: "AUTH",
      status: "TRIAGED",
      customerStatus: "En revisión",
      openedAt: "2026-09-06T08:40:00.000Z",
      lastActivityAt: "2026-09-06T08:41:00.000Z",
      resolvedAt: null,
      closedAt: null,
      internalStatus: "TRIAGED",
      priority: "P1",
      impact: "INDIVIDUAL",
      urgency: "CRITICAL",
      sensitivity: "SENSITIVE",
      queueId: "1",
      categoryId: "3",
      assigneeAgentId: null,
      subjectContextType: "CONSUMER",
      subjectCustomerId: "9002",
      subjectPartnerProfileId: null,
      internalSummary: null,
      escalationLevel: 0,
      transferCount: 0,
      legalHold: false,
      retentionClassCode: "STANDARD",
      originContext: null,
    },
  ],
  nextCursor: null,
};

const COLAS = {
  queues: [
    {
      queueId: "1",
      queueCode: "CONSUMER_L1",
      name: "Consumidores · nivel 1",
      description: null,
      contextType: "CONSUMER",
      defaultPriority: "P3",
      slaPolicyCode: "STANDARD",
      skillsRequired: ["CONSUMER_SUPPORT"],
    },
    {
      queueId: "2",
      queueCode: "PAYMENTS",
      name: "Pagos y conciliación",
      description: null,
      contextType: "CONSUMER",
      defaultPriority: "P2",
      slaPolicyCode: "STANDARD",
      skillsRequired: ["RECONCILIATION"],
    },
  ],
};

const CANALES = {
  channels: [
    {
      channelId: "770",
      caseId: "5002",
      status: "QUEUED",
      channelType: "CHAT",
      queueId: "1",
      assignedAgentId: null,
      requestedAt: "2026-09-07T11:30:00.000Z",
      lastMessageAt: "2026-09-07T11:30:00.000Z",
    },
    {
      channelId: "769",
      caseId: null,
      status: "QUEUED",
      channelType: "CHAT",
      queueId: "1",
      assignedAgentId: null,
      requestedAt: "2026-09-07T10:05:00.000Z",
      lastMessageAt: "2026-09-07T10:06:00.000Z",
    },
  ],
};

const HISTORIA = {
  events: [
    {
      eventId: "1",
      eventType: "CASE_CREATED",
      actorType: "CUSTOMER",
      actorId: "9001",
      occurredAt: "2026-09-05T14:12:00.000Z",
      payload: null,
    },
    {
      eventId: "2",
      eventType: "CASE_TRIAGED",
      actorType: "AGENT",
      actorId: "4",
      occurredAt: "2026-09-05T14:20:00.000Z",
      payload: null,
    },
    {
      eventId: "3",
      eventType: "CASE_TRANSFERRED",
      actorType: "AGENT",
      actorId: "4",
      occurredAt: "2026-09-06T10:00:00.000Z",
      payload: null,
    },
  ],
  assignments: [],
};

const AGENTES = {
  agents: [
    {
      agentProfileId: "4",
      internalUserId: "3",
      email: "agente.l1@atlas.bo",
      fullName: "Rocío Mamani Quispe",
      roleCode: "SUPPORT_AGENT",
      supportLevel: "L1",
      defaultQueueId: "1",
      maxConcurrentChannels: 3,
      activeChannelCount: 1,
      presenceState: "AVAILABLE",
      employmentStatus: "active",
      isActive: true,
    },
    {
      agentProfileId: "5",
      internalUserId: "6",
      email: "supervisor@atlas.bo",
      fullName: "Daniel Céspedes",
      roleCode: "SUPPORT_SUPERVISOR",
      supportLevel: "SUPERVISOR",
      defaultQueueId: null,
      maxConcurrentChannels: 5,
      activeChannelCount: 0,
      presenceState: "OFFLINE",
      employmentStatus: "inactive",
      isActive: false,
    },
  ],
};

const SIN_PERFIL = {
  estado: 403,
  cuerpo: {
    requestId: "req-evidencia-403",
    error: {
      code: "SUPPORT_AGENT_PROFILE_REQUIRED",
      message: "Este usuario interno no tiene perfil de agente de soporte habilitado.",
    },
    timestamp: "2026-09-08T12:00:00.000Z",
  },
};

type Ruta = readonly [RegExp, unknown];

async function preparar(page: Page, rutas: readonly Ruta[]): Promise<void> {
  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem(
      "atlas_internal_session_v3",
      JSON.stringify(sesion),
    );
  }, SESION);

  /*
   * El comodín se limita a `/api/v1` y NO a todas las peticiones: con `next dev` el framework pide
   * sus cargas RSC y su HMR por `fetch` contra el mismo origen, y abortarlas mata la navegación
   * antes de llegar a la pantalla. Va primero porque Playwright evalúa las rutas en orden inverso.
   */
  await page.route("**/api/v1/**", (route) => route.abort());

  for (const [patron, json] of rutas) {
    await page.route(
      (url) => url.pathname.startsWith("/api/v1") && patron.test(url.pathname),
      (route) => route.fulfill({ json: { data: json } }),
    );
  }
}

async function ocultarIndicadorDeDev(page: Page): Promise<void> {
  await page
    .addStyleTag({ content: "nextjs-portal{display:none!important}" })
    .catch(() => undefined);
}

async function capturar(page: Page, nombre: string): Promise<void> {
  await page.waitForTimeout(1200);
  await ocultarIndicadorDeDev(page);
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true });
}

const RUTAS_BASE: readonly Ruta[] = [
  [/\/internal\/support\/cases$/, CASOS],
  [/\/internal\/support\/queues$/, COLAS],
  [/\/internal\/support\/desk\/queue$/, CANALES],
];

test("Soporte — bandeja de casos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparar(page, RUTAS_BASE);
  await page.goto("/internal/support", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Bandeja de casos",
    { timeout: 20_000 },
  );
  await expect(page.getByText("SUP-2026-000481")).toBeVisible();
  await expect(page.getByText("Conversaciones en espera")).toBeVisible();
  await capturar(page, "bandeja-casos");
});

test("Soporte — ficha del caso con su historia", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparar(page, [
    [/\/internal\/support\/cases\/5001\/timeline$/, HISTORIA],
    [/\/internal\/support\/cases\/5001$/, CASOS.cases[0]],
    ...RUTAS_BASE,
  ]);
  await page.goto("/internal/support/cases/5001", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "SUP-2026-000481",
    { timeout: 20_000 },
  );
  await expect(page.getByText("CASE_TRIAGED")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolver" })).toBeVisible();
  await capturar(page, "ficha-caso");
});

test("Soporte — agentes de la mesa", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparar(page, [
    [/\/internal\/support\/desk\/agents$/, AGENTES],
    [/\/internal\/support\/queues$/, COLAS],
  ]);
  await page.goto("/internal/support/agents", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Agentes de la mesa",
    { timeout: 20_000 },
  );
  await expect(page.getByText("Dado de baja")).toBeVisible();
  await capturar(page, "agentes");
});

/**
 * El fallo original, tal y como lo veía quien abría la pantalla.
 *
 * Antes de este trabajo la respuesta era 403 y no había pantalla ninguna. Ahora la hay, y lo que se
 * comprueba aquí es que el 403 NO se lea como «no hay casos» ni como «acceso denegado» a secas:
 * tiene que decir que falta el perfil y llevar a donde se habilita.
 */
test("Soporte — sin perfil de agente, la pantalla explica qué falta", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem(
      "atlas_internal_session_v3",
      JSON.stringify(sesion),
    );
  }, SESION);
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.route(
    (url) => url.pathname.startsWith("/api/v1/internal/support"),
    (route) =>
      route.fulfill({ status: SIN_PERFIL.estado, json: SIN_PERFIL.cuerpo }),
  );

  await page.goto("/internal/support", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByText("Tu usuario todavía no es agente de soporte"),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("link", { name: "Ir a Soporte · Agentes" }),
  ).toBeVisible();
  await expect(page.getByText("No hay casos para estos filtros.")).toHaveCount(0);
  await capturar(page, "sin-perfil-de-agente");
});
