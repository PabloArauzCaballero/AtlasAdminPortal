import type {
  ProcessDetail,
  ProcessListItem,
  ProcessStep,
} from "@/features/processes/types";

export function makeItem(
  overrides: Partial<ProcessListItem> = {},
): ProcessListItem {
  return {
    processId: "P-01",
    code: "account_signup_to_login",
    name: "Alta de cuenta",
    description: "De la primera pantalla a la sesión iniciada.",
    processType: "customer_journey",
    priority: "P0",
    ownerRole: "OPERATIONS_MANAGER",
    systems: ["ATLAS_BACKEND"],
    clients: ["CONSUMER_APP", "ADMIN_PORTAL"],
    stageCount: 4,
    stepCount: 12,
    documentation: {
      narrative: true,
      owner: true,
      instanceEntity: true,
      screens: true,
      inDatabase: true,
      complete: true,
      syncedAt: "2026-09-26T10:00:00.000Z",
    },
    wiring: { wired: 2, unwired: 0, unknown: 0, personSteps: 2 },
    hasInstances: true,
    ...overrides,
  };
}

export function makeStep(overrides: Partial<ProcessStep> = {}): ProcessStep {
  return {
    code: "resend_code",
    name: "Reenviar el código",
    description: "El operador reenvía el código de verificación.",
    kind: "http",
    system: "ATLAS_BACKEND",
    method: "POST",
    path: "/customer-onboarding/:id/contact-verification/request",
    wiring: "wired",
    flowId: "flow_abc123def456",
    verification: "VERIFIED",
    risk: "MEDIUM",
    callers: ["ADMIN_PORTAL"],
    ...overrides,
  };
}

export function makeDetail(
  overrides: Partial<ProcessDetail> = {},
): ProcessDetail {
  const text =
    "Una respuesta suficientemente larga para contar como contestada.";
  return {
    processId: "P-01",
    code: "account_signup_to_login",
    version: "v1",
    name: "Alta de cuenta",
    description: "De la primera pantalla a la sesión iniciada.",
    processType: "customer_journey",
    ownerDomain: "customer_onboarding",
    ownerRole: "OPERATIONS_MANAGER",
    priority: "P0",
    systems: ["ATLAS_BACKEND"],
    narrative: {
      whyExists: `Por qué: ${text}`,
      whoStartsAndCloses: `Quién: ${text}`,
      startAndEnd: `Cuándo: ${text}`,
      whenItFails: `Fallo: ${text}`,
      healthIndicator: `Salud: ${text}`,
    },
    instanceEntity: {
      system: "ATLAS_BACKEND",
      schema: "customer",
      table: "customers",
      idColumn: "_id",
      statusColumn: "lifecycle_status",
    },
    success: "El cliente queda con sesión iniciada.",
    failure: "El alta queda sin contacto verificado.",
    sources: ["docs/onboarding-flujo-corregido.md"],
    stages: [
      {
        code: "contacts",
        name: "Contactos pendientes",
        description: "El equipo reenvía códigos que no llegaron.",
        module: "operations",
        actor: "internal_user",
        client: "ADMIN_PORTAL",
        screen: "/internal/operations/pending-contacts",
        steps: [
          makeStep(),
          makeStep({
            code: "close_contact",
            name: "Cerrar el contacto",
            wiring: "unwired",
            callers: [],
          }),
        ],
      },
    ],
    documentation: makeItem().documentation,
    wiring: { wired: 1, unwired: 1, unknown: 0, personSteps: 2 },
    codeHash: "aaaaaaaaaaaaaaaa",
    databaseHash: "aaaaaaaaaaaaaaaa",
    ...overrides,
  };
}
