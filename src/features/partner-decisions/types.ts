import type { PaginatedResponse } from "@/shared/api/types";

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

export type PartnerQueueResponse = PaginatedResponse<PartnerQueueItem>;
