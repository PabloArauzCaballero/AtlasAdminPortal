export type QaScenarioKey =
  | "valid_payload"
  | "without_auth"
  | "invalid_token"
  | "wrong_role_token"
  | "missing_tenant"
  | "missing_idempotency_key"
  | "invalid_payload"
  | "custom";

export type QaAuthOverridePatch = {
  authMode: "session" | "none" | "invalid" | "custom";
  includeTenantHeader: boolean;
  includeIdempotencyKey: boolean;
};

export type QaScenarioDefinition = {
  key: QaScenarioKey;
  label: string;
  description: string;
  expectedOutcome: string;
  patch?: QaAuthOverridePatch;
};

export const QA_SCENARIOS: QaScenarioDefinition[] = [
  {
    key: "valid_payload",
    label: "Payload valido",
    description: "Usa la sesion actual, tenant e idempotency-key normales.",
    expectedOutcome: "Respuesta exitosa segun el contrato del endpoint.",
    patch: {
      authMode: "session",
      includeTenantHeader: true,
      includeIdempotencyKey: true,
    },
  },
  {
    key: "without_auth",
    label: "Sin autenticacion",
    description: "Elimina el header Authorization antes de enviar el request.",
    expectedOutcome: "401 si el endpoint requiere sesion.",
    patch: {
      authMode: "none",
      includeTenantHeader: true,
      includeIdempotencyKey: true,
    },
  },
  {
    key: "invalid_token",
    label: "Token invalido",
    description: "Envia un Bearer token corrupto/expirado a proposito.",
    expectedOutcome: "401 por token invalido o expirado.",
    patch: {
      authMode: "invalid",
      includeTenantHeader: true,
      includeIdempotencyKey: true,
    },
  },
  {
    key: "wrong_role_token",
    label: "Token de otro rol",
    description:
      "Pega manualmente un token de un actor sin permiso (customer, merchant, etc.) en 'Token manual'.",
    expectedOutcome: "403 por rol/permiso insuficiente.",
    patch: {
      authMode: "custom",
      includeTenantHeader: true,
      includeIdempotencyKey: true,
    },
  },
  {
    key: "missing_tenant",
    label: "Sin x-tenant-id",
    description: "Omite el header x-tenant-id en endpoints de negocio.",
    expectedOutcome: "400/422 si el endpoint exige tenant.",
    patch: {
      authMode: "session",
      includeTenantHeader: false,
      includeIdempotencyKey: true,
    },
  },
  {
    key: "missing_idempotency_key",
    label: "Sin x-idempotency-key",
    description: "Omite x-idempotency-key en metodos mutables.",
    expectedOutcome:
      "Depende del endpoint; util para probar reintentos duplicados.",
    patch: {
      authMode: "session",
      includeTenantHeader: true,
      includeIdempotencyKey: false,
    },
  },
  {
    key: "invalid_payload",
    label: "Payload invalido",
    description:
      "Mantiene auth normal; edita manualmente el JSON de payload para romper la validacion.",
    expectedOutcome: "400/422 VALIDATION_ERROR.",
    patch: {
      authMode: "session",
      includeTenantHeader: true,
      includeIdempotencyKey: true,
    },
  },
  {
    key: "custom",
    label: "Personalizado",
    description: "No aplica ningun preset; controla cada opcion manualmente.",
    expectedOutcome: "Depende de la configuracion manual.",
  },
];

export function getQaScenario(key: string): QaScenarioDefinition {
  return (
    QA_SCENARIOS.find((scenario) => scenario.key === key) ?? QA_SCENARIOS[0]
  );
}
