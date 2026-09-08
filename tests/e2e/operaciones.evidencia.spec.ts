import { expect, test, type Page } from "@playwright/test";

/** Fuera de `test-results/`: Playwright la vacía en cada corrida. */
const SALIDA = process.env.OPS_SHOTS ?? "test-results/operaciones";

/**
 * Evidencia visual de las vistas del grupo «Operaciones».
 *
 * Corre sin login y sin backend, igual que `gobierno-calidad.evidencia.spec.ts`: siembra la sesión
 * en `sessionStorage` y contesta las llamadas de datos desde la propia prueba. Lo que se mide es el
 * CÓDIGO DE PANTALLA —la composición—, no el stack.
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
    roles: [
      "admin",
      "platform_admin",
      "internal_operator",
      "risk_analyst",
      "fraud_analyst",
      "compliance_analyst",
    ],
    legacyRoles: [],
    permissions: [
      "merchant.users.read",
      "merchant.users.manage",
      "expedientes.leer",
      "audit.events.read",
      // Catálogos operativos se protege con `PermissionGate`, no con roles: sin este permiso la
      // pantalla pinta «Acceso restringido» —sin `h1`— y la prueba parecía un fallo de la vista.
      "operations.catalogs.read",
    ],
  },
  session: { expiresAt: "2099-01-01T00:00:00.000Z" },
};

const meta = (total: number) => ({ page: 1, limit: 25, total, totalPages: 1 });

const WORK_QUEUE = {
  items: [
    {
      workItemType: "manual_review",
      caseId: "11111111-1111-4111-8111-111111111111",
      caseCode: "MR-2026-000481",
      customerId: "c-9001",
      priority: "high",
      status: "open",
      reasonCode: "kyc_document_unreadable",
      decisionExecutionId: "exec-77c1",
      openedAt: "2026-09-05T14:12:00.000Z",
      createdAt: "2026-09-05T14:12:00.000Z",
    },
    {
      workItemType: "fraud",
      caseId: "22222222-2222-4222-8222-222222222222",
      caseCode: "FR-2026-000112",
      customerId: "c-9002",
      priority: "critical",
      status: "in_review",
      reasonCode: "device_reuse_across_identities",
      decisionExecutionId: null,
      openedAt: "2026-09-06T08:40:00.000Z",
      createdAt: "2026-09-06T08:40:00.000Z",
    },
    {
      workItemType: "manual_review",
      caseId: "33333333-3333-4333-8333-333333333333",
      caseCode: null,
      customerId: "c-9003",
      priority: "medium",
      status: "open",
      reasonCode: "income_below_threshold",
      decisionExecutionId: null,
      openedAt: "2026-09-06T09:05:00.000Z",
      createdAt: "2026-09-06T09:05:00.000Z",
    },
  ],
  meta: meta(3),
};

const MERCHANT_USERS = {
  items: [
    {
      id: "7",
      email: "cajero@ferreteriacentral.bo",
      fullName: "Marisol Quiroga Vargas",
      phone: "+591 70011223",
      userCode: "MU-0007",
      role: "merchant_admin",
      status: "active",
      mustChangePassword: false,
      lastLoginAt: "2026-09-05T19:22:00.000Z",
    },
    {
      id: "8",
      email: "sucursal.norte@electrohogar.bo",
      fullName: "Javier Peñaranda",
      phone: null,
      userCode: "MU-0008",
      role: "merchant_operator",
      status: "invited",
      mustChangePassword: true,
      lastLoginAt: null,
    },
  ],
  page: 1,
  limit: 25,
  total: 2,
};

const PARTNER_QUEUE = {
  items: [
    {
      partnerId: "4410",
      legalName: "Ferretería Central S.R.L.",
      tradeName: "Ferretería Central",
      taxId: "1028394017",
      onboardingStatus: "under_review",
      submittedAt: "2026-09-02T11:00:00.000Z",
      mdrRatePercent: null,
      // El Motor lo derivó a una persona y abrió SU caso: aquí no se decide.
      decision: {
        executionId: "exec-4410",
        outcome: "REVISION_MANUAL",
        reason: "KYB_SENALES_OPERATIVAS",
        artifactVersionId: "9",
        manualReviewCaseCode: "MRC-4410",
        evaluatedAt: "2026-09-02T11:00:05.000Z",
      },
    },
    {
      partnerId: "4411",
      legalName: "Comercial Electrohogar Ltda.",
      tradeName: "Electrohogar",
      taxId: "3390182004",
      onboardingStatus: "under_review",
      submittedAt: "2026-09-04T16:30:00.000Z",
      mdrRatePercent: "3.50",
      // Sin veredicto: se envió con el Motor caído. La decisión manual es la que hay.
      decision: null,
    },
  ],
  meta: meta(2),
};

const PROVISIONING_QUEUE = {
  items: [
    {
      id: "31",
      source: "erp",
      externalReference: "9f1c-erp",
      accountReference: "acc-1",
      accountName: "Ferretería Central S.R.L.",
      branchName: "Casa matriz",
      email: "encargada@ferreteriacentral.bo",
      fullName: "Marisol Quiroga Vargas",
      phone: "+591 70011223",
      roleCode: "MERCHANT_ADMIN",
      requestedBy: "ejecutivo.comercial@atlas.bo",
      requestedAt: "2026-09-05T15:10:00.000Z",
      status: "pending",
      merchantUserId: null,
      decidedAt: null,
      rejectionReason: null,
    },
    {
      id: "30",
      source: "erp",
      externalReference: "8a02-erp",
      accountReference: "acc-2",
      accountName: "Comercial Electrohogar Ltda.",
      branchName: "Sucursal Norte",
      email: "sucursal.norte@electrohogar.bo",
      fullName: "Javier Peñaranda",
      phone: null,
      roleCode: "MERCHANT_OPERATOR",
      requestedBy: "ejecutivo.comercial@atlas.bo",
      requestedAt: "2026-09-04T09:00:00.000Z",
      status: "rejected",
      merchantUserId: null,
      decidedAt: "2026-09-04T18:20:00.000Z",
      rejectionReason:
        "El correo no corresponde al encargado declarado en el contrato.",
    },
  ],
  page: 1,
  limit: 50,
  total: 2,
};

const PORTFOLIO = {
  policy: {
    id: "pol-1",
    policyCode: "ASFI_CARTERA",
    versionCode: "v3",
    scaleCode: "A_F",
    contaminationEnabled: true,
  },
  grades: [
    {
      grade: "A",
      gradeLabel: "Normal",
      severityRank: 1,
      loanCount: 412,
      exposureAmount: "1284900.00",
      provisionAmount: "12849.00",
    },
    {
      grade: "B",
      gradeLabel: "Problemas potenciales",
      severityRank: 2,
      loanCount: 63,
      exposureAmount: "198320.00",
      provisionAmount: "9916.00",
    },
    {
      grade: "D",
      gradeLabel: "Dudoso",
      severityRank: 4,
      loanCount: 9,
      exposureAmount: "27110.00",
      provisionAmount: "13555.00",
    },
  ],
  totals: {
    loanCount: 484,
    exposureAmount: "1510330.00",
    provisionAmount: "36320.00",
  },
};

const OUTCOME_BACKLOG = {
  items: [
    {
      loanId: "l-3301",
      decisionExecutionId: "exec-91aa",
      windowDays: 90,
      label: null,
      attempts: 5,
      lastError: "ECONNREFUSED decision-engine:4000",
      observedAt: "2026-09-01T00:00:00.000Z",
    },
  ],
};

/** La salud de la entrega de desenlaces al Motor: sustituye a los botones de runbook. */
const OUTCOME_STATUS = {
  pending: 4,
  retrying: 1,
  exhausted: 1,
  sent: 40,
  oldestPendingObservedAt: "2026-08-01T00:00:00.000Z",
  lastSentAt: "2026-09-07T10:00:00.000Z",
  configured: true,
  maxAttempts: 6,
};

const CATALOGS = {
  items: [
    {
      catalogId: "cat-1",
      catalogCode: "rejection_reasons",
      catalogName: "Motivos de rechazo",
      domain: "riesgo",
      description:
        "Motivos normalizados con los que se comunica un rechazo al solicitante.",
      ownerTeam: "Riesgo",
      isActive: true,
      currentVersion: {
        catalogVersionId: "v-1",
        versionCode: "v7",
        status: "published",
        validFrom: "2026-07-01T00:00:00.000Z",
        validUntil: null,
      },
    },
    {
      catalogId: "cat-2",
      catalogCode: "document_types",
      catalogName: "Tipos de documento",
      domain: "identidad",
      description: "Documentos aceptados para verificar identidad en Bolivia.",
      ownerTeam: null,
      isActive: true,
      currentVersion: {
        catalogVersionId: "v-2",
        versionCode: "v3",
        status: "pending_approval",
        validFrom: null,
        validUntil: null,
      },
    },
  ],
};

const VISTAS = [
  {
    nombre: "Cola de trabajo",
    ruta: "/internal/operations/work-queue",
    rutas: [[/\/operations\/work-queue$/, WORK_QUEUE]] as const,
  },
  {
    nombre: "Usuarios de comercio",
    ruta: "/internal/merchant-users",
    rutas: [
      [/\/merchant\/users\/provisioning-requests$/, PROVISIONING_QUEUE],
      [/\/merchant\/users$/, MERCHANT_USERS],
    ] as const,
  },
  {
    nombre: "Expedientes de comercio",
    ruta: "/internal/operations/partners",
    rutas: [[/\/operations\/partners\/queue$/, PARTNER_QUEUE]] as const,
  },
  {
    nombre: "Calificación de cartera",
    ruta: "/internal/operations/portfolio",
    rutas: [
      [/\/operations\/credit-rating\/portfolio-summary$/, PORTFOLIO],
      [/\/operations\/loans\/outcome-status$/, OUTCOME_STATUS],
      [/\/operations\/loans\/outcome-backlog$/, OUTCOME_BACKLOG],
    ] as const,
  },
  {
    nombre: "Catalogos operativos",
    ruta: "/internal/operations/catalogs",
    rutas: [[/\/operations\/catalogs$/, CATALOGS]] as const,
  },
] as const;

async function preparar(
  page: Page,
  rutas: ReadonlyArray<readonly [RegExp, unknown]>,
): Promise<void> {
  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem(
      "atlas_internal_session_v3",
      JSON.stringify(sesion),
    );
  }, SESION);

  /*
   * El comodín se limita a las rutas de la API y NO a todas las peticiones.
   *
   * Con `next dev` el propio framework pide sus cargas RSC y su HMR por `fetch` contra el MISMO
   * origen: abortar todo `fetch` mataba la navegación (`ERR_ABORTED; maybe frame was detached`) y
   * la prueba moría en el `goto`, no en la pantalla. Va primero porque Playwright evalúa las rutas
   * en orden inverso.
   */
  await page.route("**/api/v1/**", (route) => route.abort());

  for (const [patron, json] of rutas) {
    await page.route(
      (url) => url.pathname.startsWith("/api/v1") && patron.test(url.pathname),
      (route) => route.fulfill({ json: { data: json } }),
    );
  }
}

/**
 * El botón flotante de `next dev` (la burbuja con la «N») se pinta encima del contenido y no es de
 * la aplicación: en una captura de revisión se lee como un fallo de la pantalla.
 */
async function ocultarIndicadorDeDev(page: Page): Promise<void> {
  await page
    .addStyleTag({ content: "nextjs-portal{display:none!important}" })
    .catch(() => undefined);
}

for (const vista of VISTAS) {
  test(`Operaciones — ${vista.nombre} (escritorio)`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await preparar(page, vista.rutas);
    await page.goto(vista.ruta, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForTimeout(1200);
    await ocultarIndicadorDeDev(page);
    await page.screenshot({
      path: `${SALIDA}/${vista.nombre.replace(/\s+/g, "-").toLowerCase()}-desktop.png`,
      fullPage: true,
    });

    /*
     * SI una tabla desborda, su última columna TIENE que ir clavada al borde derecho.
     *
     * Desbordar no es el fallo —una tabla de ocho columnas no cabe en 1.440 px y se desplaza—; el
     * fallo es que la última columna es la ACCIÓN de la fila y, sin clavar, queda fuera de la
     * pantalla sin nada que delate que existe. Se podía llegar arrastrando en horizontal, pero
     * nadie arrastra lo que no sabe que está ahí: así estaba el botón «Decidir» de la cola de
     * trabajo. `pinRight` en el `meta` de la columna es lo que lo arregla.
     */
    const tablasDesbordadasSinClavar = await page.evaluate(() =>
      [...document.querySelectorAll(".atlas-table-scroll")]
        .filter((nodo) => nodo.scrollWidth - nodo.clientWidth > 0)
        .map((nodo) => {
          const cabeceras = [...nodo.querySelectorAll("thead th")];
          const ultima = cabeceras[cabeceras.length - 1];
          return ultima && getComputedStyle(ultima).position === "sticky"
            ? null
            : (cabeceras.map((th) => th.textContent).join(" · ") ??
                "tabla sin cabeceras");
        })
        .filter((problema): problema is string => problema !== null),
    );
    expect(
      tablasDesbordadasSinClavar,
      "tablas que se desplazan y dejan su acción fuera de la pantalla",
    ).toEqual([]);
  });

  test(`Operaciones — ${vista.nombre} (movil)`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await preparar(page, vista.rutas);
    await page.goto(vista.ruta, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForTimeout(1200);
    await ocultarIndicadorDeDev(page);
    await page.screenshot({
      path: `${SALIDA}/${vista.nombre.replace(/\s+/g, "-").toLowerCase()}-movil.png`,
      fullPage: true,
    });
    // Ninguna vista debe permitir scroll horizontal del documento.
    const desbordamiento = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(
      desbordamiento,
      "desbordamiento horizontal en px",
    ).toBeLessThanOrEqual(1);
  });
}
