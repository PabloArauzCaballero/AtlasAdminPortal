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
  /**
   * Qué códigos dan la prueba por buena en este escenario. `"contract"` = los que declara el
   * catálogo para la operación. Sin esto el escenario cambiaba la credencial pero dejaba «200»
   * como esperado, y una prueba «Sin identificarse» que respondía 401 —lo correcto— salía roja.
   */
  expectedStatusCodes?: string;
  /** El escenario necesita datos inválidos del generador. */
  loadsInvalidCase?: boolean;
};

const NORMAL = {
  authMode: "session",
  includeTenantHeader: true,
  includeIdempotencyKey: true,
} as const;

export const QA_SCENARIOS: QaScenarioDefinition[] = [
  {
    key: "valid_payload",
    label: "Datos válidos",
    description:
      "Tu sesión, con la cabecera de empresa y la clave anti-duplicados normales.",
    expectedOutcome: "Respuesta correcta según lo que declara el catálogo.",
    patch: { ...NORMAL },
    expectedStatusCodes: "contract",
  },
  {
    key: "without_auth",
    label: "Sin identificarse",
    description: "La petición sale sin token y sin la cookie de tu sesión.",
    expectedOutcome: "401 si la operación exige sesión.",
    patch: { ...NORMAL, authMode: "none" },
    expectedStatusCodes: "401",
  },
  {
    key: "invalid_token",
    label: "Credencial falsa",
    description:
      "Envía un token corrupto a propósito, sin la cookie de tu sesión.",
    expectedOutcome: "401 por credencial inválida o vencida.",
    patch: { ...NORMAL, authMode: "invalid" },
    expectedStatusCodes: "401",
  },
  {
    key: "wrong_role_token",
    label: "Token de otro rol",
    description:
      "Pega en «Token de otro actor» el token de alguien sin permiso (cliente, comercio…). Sin token, el laboratorio no envía.",
    expectedOutcome: "403 por rol o permiso insuficiente.",
    patch: { ...NORMAL, authMode: "custom" },
    expectedStatusCodes: "403",
  },
  {
    key: "missing_tenant",
    label: "Sin cabecera de empresa",
    description:
      "Omite x-tenant-id, la cabecera que dice a qué empresa pertenece la petición.",
    expectedOutcome: "400, 403 o 422 si la operación exige empresa.",
    patch: { ...NORMAL, includeTenantHeader: false },
    expectedStatusCodes: "400, 403, 422",
  },
  {
    key: "missing_idempotency_key",
    label: "Sin clave anti-duplicados",
    description:
      "Omite x-idempotency-key en operaciones que cambian datos. Las que la exigen deben rechazar.",
    expectedOutcome:
      "400 si la operación la exige (p. ej. el alta de cliente).",
    patch: { ...NORMAL, includeIdempotencyKey: false },
    expectedStatusCodes: "400",
  },
  {
    key: "invalid_payload",
    label: "Datos inválidos",
    description:
      "Carga un caso inválido del generador (un dato que rompe una regla o un obligatorio que falta).",
    expectedOutcome: "400 o 422: error de validación.",
    patch: { ...NORMAL },
    expectedStatusCodes: "400, 422",
    loadsInvalidCase: true,
  },
  {
    key: "custom",
    label: "Personalizado",
    description: "No toca nada: controlas cada opción a mano.",
    expectedOutcome: "Depende de lo que configures.",
  },
];

export function getQaScenario(key: string): QaScenarioDefinition {
  return (
    QA_SCENARIOS.find((scenario) => scenario.key === key) ?? QA_SCENARIOS[0]
  );
}
