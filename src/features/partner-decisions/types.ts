import type { PaginatedResponse } from "@/shared/api/types";

/**
 * Un expediente esperando verificación, tal y como lo publica
 * `GET /operations/partners/queue`.
 *
 * El backend devuelve el perfil entero; aquí sólo se declaran los campos que la cola usa. El resto
 * se lee en el detalle, que sigue pidiendo el expediente completo.
 */
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
  [key: string]: unknown;
};

export type PartnerQueueResponse = PaginatedResponse<PartnerQueueItem>;
