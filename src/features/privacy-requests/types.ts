/**
 * Solicitudes de derechos del titular (hallazgo A5).
 *
 * Es la forma que devuelve `GET /operations/privacy/data-subject-requests`: el plazo (`dueAt`) y el
 * «vencida» (`overdue`) los calcula el backend a 15 días naturales desde la recepción, con un único
 * «ahora» para la página y el resumen. La pantalla no recalcula nada: si lo hiciera con el reloj
 * del navegador, la lista y el resumen podrían no coincidir.
 */
export const PRIVACY_REQUEST_STATUSES = [
  "received",
  "in_progress",
  "completed",
  "rejected",
] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const PRIVACY_REQUEST_TYPES = [
  "access",
  "rectification",
  "deletion",
  "portability",
  "revocation",
  "restriction",
  "erasure",
  "objection",
] as const;

export type PrivacyRequest = {
  requestId: string;
  requestCode: string | null;
  requestType: string | null;
  status: PrivacyRequestStatus | string;
  receivedAt: string;
  dueAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  handledByInternalUserId: string | null;
  handledByName: string | null;
  customerId: string | null;
  customerCode: string | null;
  customerName: string | null;
  overdue: boolean;
  /** Días que faltan (positivo) o que lleva vencida (negativo); `null` si ya está cerrada. */
  daysToDue: number | null;
  /** Lo que la persona escribió al pedir (antes de 2026-10-04 no se guardaba: `null` en las viejas). */
  description?: string | null;
  /** Qué dato quiere corregir (vocabulario cerrado del backend); `null` en un borrado. */
  rectificationField?: string | null;
  /** Si trae un valor propuesto. El valor sólo llega en el detalle, descifrado y con su lectura auditada. */
  hasProposedValue?: boolean;
  /** Cuándo confirmó el PIN antes de pedir (lo comprueba el servidor). `null` = no lo confirmó. */
  pinVerifiedAt?: string | null;
  /** Lo que opinó el Motor (fase en sombra). `null` = nunca se le preguntó. */
  engine?: PrivacyEngineOpinion | null;
};

/** La opinión del Motor sobre una solicitud. Con intentos y sin `decision`, el Motor no contestó: `lastError` dice por qué. */
export type PrivacyEngineOpinion = {
  mode: "shadow" | "enforce" | string | null;
  decision: "ACEPTAR" | "RECHAZAR" | "REVISION_HUMANA" | string | null;
  reasonCode: string | null;
  action: string | null;
  riskSignals: number | null;
  reevaluateCredit: boolean | null;
  /** Los hechos que se le mandaron: booleanos, contadores y códigos, nada personal. */
  inputs: Record<string, unknown> | null;
  executionId: string | null;
  artifactCode: string | null;
  artifactVersionId: string | null;
  decidedAt: string | null;
  attempts: number;
  lastError: string | null;
};

export type PrivacyRequestList = {
  items: PrivacyRequest[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { open: number; overdue: number; dueDays: number };
};

export type PrivacyRequestHistoryEntry = {
  action: "created" | "transition";
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  actorType: string | null;
  actorInternalUserId: string | null;
  actorName: string | null;
  occurredAt: string | null;
};

export type PrivacyRequestDetail = PrivacyRequest & {
  /** El valor correcto que propone la persona, descifrado. Verlo deja constancia en la auditoría. */
  proposedValue?: string | null;
  allowedTransitions: PrivacyRequestStatus[];
  history: PrivacyRequestHistoryEntry[];
};

export type PrivacyTransitionTarget = "in_progress" | "completed" | "rejected";
