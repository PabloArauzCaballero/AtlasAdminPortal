import type { Option } from "@/shared/lib/options";
import type { EligibilityDecision } from "./customer-actions-types";

/**
 * Espejo de la máquina de estados del cliente en AtlasBackend
 * (`modules/customers/customer-lifecycle.constants.ts`, `ALLOWED_TRANSITIONS`).
 *
 * El servidor es quien manda: una transición ilegal vuelve con 422 `INVALID_STATUS_TRANSITION`
 * aunque la pantalla la ofreciera. El espejo sólo sirve para no OFRECER lo que se va a rechazar y
 * explicar por qué no se puede, que es lo que la persona necesita saber antes de escribir una nota.
 */
export const LIFECYCLE_TRANSITIONS: Readonly<
  Record<string, readonly string[]>
> = {
  registered: ["onboarding_in_progress", "observed", "blocked", "closed"],
  onboarding_in_progress: ["under_review", "observed", "blocked", "closed"],
  under_review: ["active", "observed", "rejected", "blocked", "closed"],
  observed: [
    "onboarding_in_progress",
    "under_review",
    "rejected",
    "blocked",
    "closed",
  ],
  active: ["active", "observed", "suspended", "blocked", "closed"],
  suspended: ["active", "observed", "under_review", "blocked", "closed"],
  rejected: ["under_review", "closed"],
  blocked: ["under_review", "closed"],
  closed: [],
};

/** Nombre en español de cada estado canónico del cliente. */
export const LIFECYCLE_LABELS: Readonly<Record<string, string>> = {
  registered: "Registrado",
  onboarding_in_progress: "Completando el alta",
  under_review: "En revisión",
  observed: "Observado",
  active: "Activo",
  suspended: "Suspendido",
  rejected: "Rechazado",
  blocked: "Bloqueado",
  closed: "Cerrado",
};

/** Estado al que lleva cada decisión (tabla `DECISION_TO_STATUS` del servidor). */
export const DECISION_TARGET: Readonly<Record<EligibilityDecision, string>> = {
  approve: "active",
  reject: "rejected",
  observe: "observed",
  suspend: "suspended",
  reinstate: "under_review",
};

/** Las decisiones que no exigen nota: el servidor rechaza las demás sin ella. */
export const DECISIONS_WITHOUT_NOTE: ReadonlySet<EligibilityDecision> = new Set(
  ["approve", "reinstate"],
);

const DECISIONS: ReadonlyArray<{
  value: EligibilityDecision;
  label: string;
  description: string;
}> = [
  {
    value: "approve",
    label: "Aprobar",
    description:
      "Deja al cliente activo. Si aún tiene bloqueadores, queda registrado como excepción autorizada.",
  },
  {
    value: "observe",
    label: "Observar",
    description:
      "Falta o hay que corregir algo concreto; el cliente puede actuar desde la app.",
  },
  {
    value: "suspend",
    label: "Suspender",
    description:
      "Pausa la habilitación de un cliente activo por una alerta o un cambio sensible.",
  },
  {
    value: "reject",
    label: "Rechazar",
    description:
      "Cierra la habilitación por riesgo o cumplimiento; sólo se reabre pasando otra vez por revisión.",
  },
  {
    value: "reinstate",
    label: "Reincorporar a revisión",
    description:
      "Devuelve a revisión a un cliente rechazado, bloqueado o suspendido para evaluarlo de nuevo.",
  },
];

/** Normaliza lo que pueda quedar de estados anteriores a la máquina canónica. */
const LEGACY: Readonly<Record<string, string>> = {
  pending_identity_review: "under_review",
  pending_review: "under_review",
  pending_fraud_review: "under_review",
  pending_more_information: "observed",
  approved: "active",
  approved_for_next_step: "active",
};

export function canonicalStatus(status: string | null | undefined): string {
  if (!status) return "registered";
  if (status in LIFECYCLE_TRANSITIONS) return status;
  return LEGACY[status] ?? "registered";
}

export function isDecisionAllowed(
  currentStatus: string | null | undefined,
  decision: EligibilityDecision,
): boolean {
  const from = canonicalStatus(currentStatus);
  return (LIFECYCLE_TRANSITIONS[from] ?? []).includes(
    DECISION_TARGET[decision],
  );
}

/**
 * Las opciones del desplegable para el estado actual del cliente. Las ilegales se muestran
 * deshabilitadas y DICEN por qué, en vez de desaparecer sin explicación.
 */
export function eligibilityDecisionOptions(
  currentStatus: string | null | undefined,
): Option[] {
  const from = canonicalStatus(currentStatus);
  return DECISIONS.map((item) => {
    const target = LIFECYCLE_LABELS[DECISION_TARGET[item.value]];
    const allowed = isDecisionAllowed(currentStatus, item.value);
    return {
      value: item.value,
      label: `${item.label} → ${target}`,
      description: allowed
        ? item.description
        : `No se puede desde «${LIFECYCLE_LABELS[from] ?? from}»: la máquina de estados del cliente no permite pasar a «${target}».`,
      disabled: !allowed,
    };
  });
}

export function firstAllowedDecision(
  currentStatus: string | null | undefined,
): EligibilityDecision | null {
  return (
    DECISIONS.find((item) => isDecisionAllowed(currentStatus, item.value))
      ?.value ?? null
  );
}

export function lifecycleLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return LIFECYCLE_LABELS[status] ?? status;
}

/** Qué significa cada bloqueador de la habilitación, en lenguaje de operación. */
export const BLOCKER_LABELS: Readonly<Record<string, string>> = {
  ACCOUNT_NOT_ACTIVE: "La cuenta no está activa",
  NO_CREDENTIALS: "Sin credenciales de acceso",
  CONTACT_NOT_VERIFIED: "Contacto sin verificar",
  PROFILE_INCOMPLETE: "Datos personales incompletos",
  FINANCIAL_PROFILE_INCOMPLETE: "Situación económica incompleta",
  ADDRESS_MISSING: "Falta el domicilio",
  REFERENCES_INSUFFICIENT: "Referencias insuficientes",
  IDENTITY_DOCUMENT_MISSING: "Falta el documento de identidad",
  IDENTITY_DOCUMENT_EXPIRED: "Documento de identidad vencido",
  IDENTITY_NOT_VERIFIED: "Identidad sin verificar",
  EVIDENCE_PENDING_REVIEW: "Evidencias pendientes de revisión",
  CONSENT_MISSING: "Falta un consentimiento",
  OPEN_OBSERVATIONS: "Observaciones abiertas",
  COMPLIANCE_MATCH_PENDING: "Coincidencia en listas restrictivas sin resolver",
  RISK_NOT_APPROVED: "Riesgo no aprobado",
  RISK_ASSESSMENT_STALE: "Evaluación de riesgo vencida",
  FRAUD_CASE_OPEN: "Caso de fraude abierto",
};

export function blockerLabel(code: string): string {
  return BLOCKER_LABELS[code] ?? code;
}
