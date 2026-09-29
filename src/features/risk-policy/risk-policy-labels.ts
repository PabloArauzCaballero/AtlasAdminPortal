/**
 * Etiquetas en español para los códigos de la política de riesgo local.
 *
 * El backend manda los códigos tal cual están en `risk.risk_policy_rules` (`capacity`,
 * `MANUAL_REVIEW`, `bnpl_responsible_lending`…) y la tabla los pintaba crudos: quien revisa la
 * política leía jerga de base de datos en vez de lo que la regla hace. Un código que no esté aquí
 * se muestra legible (sin guiones bajos) y no desaparece: una regla nueva tiene que verse aunque
 * nadie le haya puesto nombre todavía.
 */
const DIMENSION: Record<string, string> = {
  capacity: "Capacidad de pago",
  indebtedness: "Endeudamiento",
  financial_difficulty: "Dificultad financiera",
  servicing: "Cobranza",
  identity: "Identidad",
  fraud: "Fraude",
  behavior: "Comportamiento",
  compliance: "Cumplimiento",
};

const RULE_TYPE: Record<string, string> = {
  bnpl_responsible_lending: "Crédito responsable",
};

const SEVERITY: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const ACTION: Record<string, string> = {
  MANUAL_REVIEW: "Enviar a revisión humana",
  BLOCK: "Bloquear",
  HOLD_COLLECTION: "Suspender el cobro",
  APPROVE: "Aprobar",
  REJECT: "Rechazar",
};

const ASSESSMENT_TYPE: Record<string, string> = {
  onboarding_credit: "Alta con crédito",
};

function legible(code: string): string {
  const texto = code.replaceAll("_", " ").toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function etiqueta(
  mapa: Record<string, string>,
  code: string | null | undefined,
): string {
  if (!code) return "—";
  return mapa[code] ?? mapa[code.toLowerCase()] ?? legible(code);
}

export const riskPolicyLabel = {
  dimension: (code: string | null | undefined) => etiqueta(DIMENSION, code),
  ruleType: (code: string | null | undefined) => etiqueta(RULE_TYPE, code),
  severity: (code: string | null | undefined) => etiqueta(SEVERITY, code),
  action: (code: string | null | undefined) => etiqueta(ACTION, code),
  assessmentType: (code: string | null | undefined) =>
    etiqueta(ASSESSMENT_TYPE, code),
};

/** Catálogos cerrados de los filtros: salen de los códigos que la política conoce, no de las filas cargadas. */
export const RISK_DIMENSION_OPTIONS = Object.entries(DIMENSION).map(
  ([value, label]) => ({
    value,
    label,
    description: `Reglas que miran ${label.toLowerCase()}.`,
  }),
);

export const RISK_SEVERITY_OPTIONS = Object.entries(SEVERITY).map(
  ([value, label]) => ({
    value,
    label,
    description: `Reglas de severidad ${label.toLowerCase()}.`,
  }),
);
