import type { PaginatedResponse, PaginationMeta } from "@/shared/api/types";

/**
 * Un expediente esperando verificación, tal y como lo publica
 * `GET /operations/partners/queue`.
 *
 * El backend devuelve el perfil entero; aquí sólo se declaran los campos que la cola usa. El resto
 * se lee en el detalle, que sigue pidiendo el expediente completo.
 */
/**
 * QUIÉN decidió, antes de explicar nada.
 *
 * `null` en todo el bloque significa que el expediente se decidió (o se envió) antes de que la
 * verificación pasara al Motor, y se dice así: no se rellena con un valor inventado.
 */
export type PartnerDecisionProvenance = {
  executionId: string | null;
  outcome: string | null;
  reason: string | null;
  artifactVersionId: string | null;
  /** Con valor, el caso se resuelve en el Motor y esta consola NO ofrece decidir. */
  manualReviewCaseCode: string | null;
  evaluatedAt: string | null;
};

export type PartnerQueueItem = {
  partnerId: string;
  legalName: string | null;
  tradeName: string | null;
  taxId: string | null;
  onboardingStatus: string;
  submittedAt: string | null;
  /**
   * El término comercial, de SÓLO LECTURA aquí.
   *
   * Se negocia y se fija en el ERP —`atlas_sales.mdr_rules`, y los términos de contrato de tipo
   * `MDR`—, no en esta consola: verificar que un comercio es quien dice ser y negociar cuánto se le
   * cobra son dos decisiones distintas de dos equipos distintos.
   */
  mdrRatePercent?: string | number | null;
  decision?: PartnerDecisionProvenance | null;
  [key: string]: unknown;
};

/** `summary` es de TODA la cola (sin búsqueda ni página); ausente en un servidor anterior. */
export type PartnerQueueResponse = PaginatedResponse<PartnerQueueItem> & {
  summary?: { total: number; oldestSubmittedAt: string | null };
};

/** Un QR de cobro esperando revisión, tal y como lo publica `GET /operations/partners/qr-codes/pending`. */
export type PartnerQrPending = {
  qrId: string;
  partnerId: string;
  qrKind: "bank" | "business" | string;
  branchId: string | null;
  fingerprint: string;
  contentType: string;
  sizeBytes: number;
  bankInstitutionCode: string | null;
  accountNumberMasked: string | null;
  status: string;
  createdAt: string;
  partner: {
    legalName: string | null;
    tradeName: string | null;
    /** Desde que el buscador de la cola también busca por NIT; ausente en un servidor anterior. */
    taxId?: string | null;
    onboardingStatus: string;
  } | null;
  /** La sucursal del QR; `null` si es del comercio entero. Ausente en un servidor anterior. */
  branch?: { branchCode: string; name: string; city: string | null } | null;
};

/** De TODA la cola de QR por revisar, no de la página ni del filtro. */
export type PartnerQrPendingSummary = {
  total: number;
  business: number;
  bank: number;
  oldestCreatedAt: string | null;
};

/**
 * `meta` desde 2026-09-29 (antes llegaba la cola entera, sin paginar); `summary` desde que el
 * servidor también busca y filtra por tipo. Un Core anterior los omite.
 */
export type PartnerQrPendingResponse = {
  items: PartnerQrPending[];
  meta?: PaginationMeta;
  summary?: PartnerQrPendingSummary;
};

export type PartnerQrReviewed = {
  qrId: string;
  status: string;
  verifiedAt: string | null;
  reviewNote: string | null;
};
