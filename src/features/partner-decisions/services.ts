import { apiRequest } from "@/shared/api/client";
import type { JsonRecord } from "@/shared/api/types";

/**
 * La decisión sobre el expediente de un comercio.
 *
 * El backend lo dice sin rodeos: el expediente llegaba a `under_review` y **se quedaba ahí para
 * siempre**, porque no había un camino que escribiera la decisión. El endpoint se escribió para
 * cerrar eso… y ninguna pantalla lo llamaba, así que el agujero seguía abierto: sin comercio
 * verificado no hay QR que resuelva ni compra que se le pueda atribuir.
 */
export function getPartnerStatus(partnerId: string) {
  return apiRequest<JsonRecord>(
    `/partner-onboarding/${encodeURIComponent(partnerId)}/status`,
  );
}

export function decidePartner(
  partnerId: string,
  body: { approved: boolean; rejectionReason?: string },
) {
  return apiRequest<JsonRecord>(
    `/operations/partners/${encodeURIComponent(partnerId)}/decision`,
    { method: "POST", body },
  );
}

/** El término comercial que se negocia en el onboarding: qué se lleva Atlas por venta financiada. */
export function setPartnerMdrRate(partnerId: string, mdrRatePercent: number) {
  return apiRequest<JsonRecord>(
    `/operations/partners/${encodeURIComponent(partnerId)}/mdr-rate`,
    { method: "PATCH", body: { mdrRatePercent } },
  );
}
