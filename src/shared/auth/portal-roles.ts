/**
 * Los roles con los que AtlasBackend autoriza REALMENTE el portal operacional.
 *
 * `InternalPortalController` y `RuntimeJobsController` se guardan con `@Roles(...)`, no con
 * permisos granulares: el catálogo RBAC no publica `internal.alerts.read`, `internal.exports.read`
 * ni `internal.jobs.read`. Mientras esas pantallas se filtraban por esos permisos inventados, la
 * condición era imposible de cumplir y "Alertas", "Exportaciones", "Jobs" y "Jobs de runtime"
 * mostraban "Acceso restringido" a TODO el mundo —superadministrador incluido— sobre endpoints que
 * contestaban 200. Espejar aquí la lista del backend es lo que hace que el gate diga la verdad.
 *
 * Si el backend cambia sus `@Roles(...)`, esta lista cambia con él: no es una política propia del
 * front, es una copia declarada de la suya.
 */
export const INTERNAL_PORTAL_ROLES = [
  "internal_operator",
  "risk_analyst",
  "compliance_analyst",
  "admin",
  "platform_admin",
  "system_admin",
  "qa_engineer",
  "devops",
  "readonly_auditor",
] as const;

/** `RuntimeJobsController`: disparar un job de mantenimiento es más restringido que leerlo. */
export const RUNTIME_JOB_ROLES = ["admin", "platform_admin", "system"] as const;

/**
 * `InternalSupportDeskController`: habilitar agentes está restringido a supervisores.
 *
 * Se escribe en el vocabulario del TOKEN (`admin`, `platform_admin`) y no en el RBAC del portal
 * porque es el que mira el `@Roles(...)` del backend. Poner sólo `SUPER_ADMIN` habría escondido la
 * pantalla a un `SYSTEMS_ADMIN`, cuyo token también sale como `admin` y a quien el backend sí deja
 * entrar: el ítem desaparecería del menú sobre un endpoint que le contesta 200.
 */
export const SUPPORT_ADMIN_ROLES = ["admin", "platform_admin"] as const;

/**
 * `SupportKnowledgeAdminController`: leer, redactar, revisar, aprobar y publicar la ayuda. Ni
 * `readonly_auditor` ni `fraud_analyst` entran.
 */
export const SUPPORT_KNOWLEDGE_ROLES = [
  "internal_operator",
  "compliance_analyst",
  "risk_analyst",
  "admin",
  "platform_admin",
] as const;

/**
 * `PartnerOperationsController` (expedientes de comercio): la cola, la decisión degradada y
 * volver a pedir la verificación. Más estrecho que el portal operacional: ni `compliance_analyst`
 * ni `readonly_auditor` entran, y el ítem del menú no debe prometerles una pantalla que da 403.
 */
export const PARTNER_OPERATIONS_ROLES = [
  "internal_operator",
  "risk_analyst",
  "admin",
  "platform_admin",
] as const;

/**
 * `NotificationCampaignsController` y `NotificationAudienceSegmentsController`: leer campañas y
 * segmentos lo puede `internal_operator`; pausar, reanudar y cancelar sólo `admin`/`platform_admin`.
 * Crear, editar y programar también existen allí, pero son del ERP: este portal observa y frena.
 */
export const CAMPAIGN_READ_ROLES = [
  "internal_operator",
  "admin",
  "platform_admin",
  "system",
] as const;
export const CAMPAIGN_OPERATE_ROLES = ["admin", "platform_admin"] as const;

/**
 * `CreditOperationsController` (`operations/credit/*`): catálogo, decisión humana, aceptación del
 * negocio y recálculo de la línea. Misma lista que los expedientes de comercio, pero se declara
 * aparte porque es otro controlador y puede cambiar por su cuenta.
 */
export const CREDIT_OPERATIONS_ROLES = [
  "internal_operator",
  "risk_analyst",
  "admin",
  "platform_admin",
] as const;

/**
 * El libro de préstamos (`LoansController`, `LoanPaymentsController`, `CreditRatingController`).
 * Se gatea por `@Roles(...)` y no hay todavía permiso granular `loans.*` en el catálogo RBAC: estas
 * listas son copia declarada de las del backend, ruta por ruta.
 *
 * - Leer préstamos y solicitudes del cliente, y su informe de gasto: operación y riesgo.
 * - Calificación y escala: además cumplimiento.
 * - Desembolsar, cobrar y reversar mueven dinero: sólo operación y administración.
 * - Castigar reconoce una pérdida: sólo administración.
 */
export const LOAN_READ_ROLES = [
  "internal_operator",
  "risk_analyst",
  "admin",
  "platform_admin",
] as const;
export const LOAN_RATING_ROLES = [
  "internal_operator",
  "risk_analyst",
  "compliance_analyst",
  "admin",
  "platform_admin",
] as const;
export const LOAN_MONEY_ROLES = [
  "internal_operator",
  "admin",
  "platform_admin",
] as const;
export const LOAN_WRITE_OFF_ROLES = ["admin", "platform_admin"] as const;

export const LOAN_READ_ROLE_LIST: string[] = [...LOAN_READ_ROLES];
export const LOAN_RATING_ROLE_LIST: string[] = [...LOAN_RATING_ROLES];
export const LOAN_MONEY_ROLE_LIST: string[] = [...LOAN_MONEY_ROLES];
export const LOAN_WRITE_OFF_ROLE_LIST: string[] = [...LOAN_WRITE_OFF_ROLES];
/** Quien entra a «Préstamos»: lee préstamos o, al menos, la escala de calificación. */
export const LOAN_PORTFOLIO_ROLE_LIST: string[] = [
  ...new Set<string>([...LOAN_READ_ROLES, ...LOAN_RATING_ROLES]),
];

export const INTERNAL_PORTAL_ROLE_LIST: string[] = [...INTERNAL_PORTAL_ROLES];
export const PARTNER_OPERATIONS_ROLE_LIST: string[] = [
  ...PARTNER_OPERATIONS_ROLES,
];
export const SUPPORT_ADMIN_ROLE_LIST: string[] = [...SUPPORT_ADMIN_ROLES];
export const SUPPORT_KNOWLEDGE_ROLE_LIST: string[] = [
  ...SUPPORT_KNOWLEDGE_ROLES,
];
export const RUNTIME_JOB_ROLE_LIST: string[] = [...RUNTIME_JOB_ROLES];
export const CAMPAIGN_READ_ROLE_LIST: string[] = [...CAMPAIGN_READ_ROLES];
export const CAMPAIGN_OPERATE_ROLE_LIST: string[] = [...CAMPAIGN_OPERATE_ROLES];
export const CREDIT_OPERATIONS_ROLE_LIST: string[] = [
  ...CREDIT_OPERATIONS_ROLES,
];

/**
 * `OperationsPaymentClaimsController` (`GET /operations/payment-claims`): la cola de avisos de pago
 * de todo el tenant, sólo lectura. Los mismos roles que el estado de la cartera
 * (`GET /operations/loans/outcome-status`); el rol `merchant` no entra, tiene su propia cola en el ERP.
 */
export const PAYMENT_CLAIMS_ROLES = [
  "internal_operator",
  "risk_analyst",
  "compliance_analyst",
  "admin",
  "platform_admin",
] as const;
export const PAYMENT_CLAIMS_ROLE_LIST: string[] = [...PAYMENT_CLAIMS_ROLES];

/**
 * `DecisionArtifactBindingController` (`/internal/decision-artifacts`): qué artefacto del Motor
 * decide identidad, crédito, riesgo y comercios. El menú lo filtraba por `governance.policies.read`,
 * que tienen cumplimiento y no riesgo: la jefatura de riesgo no encontraba la pantalla que el backend
 * sí le abre, y cumplimiento la encontraba y recibía un 403.
 */
export const DECISION_ARTIFACT_ROLES = [
  "internal_operator",
  "risk_analyst",
  "admin",
  "platform_admin",
] as const;
export const DECISION_ARTIFACT_ROLE_LIST: string[] = [
  ...DECISION_ARTIFACT_ROLES,
];

/**
 * `OperationsController` (clase): cola de trabajo, contactos sin verificar, expediente del cliente
 * y la cola de revisión manual. Ni `readonly_auditor` ni QA: sin `roles` el ítem les salía y
 * respondía 403. `fraud_analyst` sólo entra a la cola de trabajo, y sólo a su pestaña «Fraude»
 * (`GET work-queue?queue=fraud`): ver `WORK_QUEUE_ROLE_LIST`.
 */
export const OPERATIONS_CASE_ROLE_LIST: string[] = [
  "internal_operator",
  "risk_analyst",
  "compliance_analyst",
  "admin",
  "platform_admin",
];

/**
 * `GET /operations/work-queue`: el `@Roles` de la ruta añade `fraud_analyst` a la clase, y el
 * servidor le responde 403 a cualquier cola que no sea `queue=fraud`.
 */
export const WORK_QUEUE_ROLE_LIST: string[] = [
  ...OPERATIONS_CASE_ROLE_LIST,
  "fraud_analyst",
];

/** `POST /operations/manual-review-cases/:id/decision` (`@Roles`): sin cumplimiento ni fraude. */
export const MANUAL_REVIEW_DECIDE_ROLE_LIST: string[] = [
  "internal_operator",
  "risk_analyst",
  "admin",
  "platform_admin",
];

/** `POST /operations/fraud-cases/:id/decision` (`@Roles`): sólo fraude y administración. */
export const FRAUD_DECIDE_ROLE_LIST: string[] = [
  "fraud_analyst",
  "admin",
  "platform_admin",
];

/** `POST /operations/customers/:id/compliance/screening` (`CustomerVerificationController`). */
export const COMPLIANCE_SCREENING_ROLE_LIST: string[] = [
  "compliance_analyst",
  "risk_analyst",
  "admin",
  "platform_admin",
];

/** `POST /operations/customers/:id/compliance/clear-matches` (`CustomerVerificationController`). */
export const COMPLIANCE_CLEAR_ROLE_LIST: string[] = [
  "compliance_analyst",
  "admin",
  "platform_admin",
];
