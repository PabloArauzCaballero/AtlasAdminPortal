import { apiRequest } from "@/shared/api/client";
import type { JsonRecord, QueryParams } from "@/shared/api/types";
import type { PartnerQueueResponse } from "./types";

/**
 * La verificación del expediente de un comercio.
 *
 * ## Ya no se teclea un identificador: hay cola
 *
 * Esta pantalla pedía escribir a mano el `partnerId`, sacado de otra vista, porque el backend no
 * publicaba ningún listado de expedientes en revisión. El efecto era que la carga de trabajo
 * pendiente no se veía en ninguna parte: un expediente que nadie mira se queda en `under_review`
 * para siempre, y con él la afiliación entera —sin comercio verificado no hay QR que resuelva ni
 * compra que se le pueda atribuir—. `GET /operations/partners/queue` se añadió justamente para
 * eso.
 *
 * ## Y ya no se DECIDE aquí, salvo degradación
 *
 * La verificación la resuelve el Motor con el artefacto `PARTNER_KYB_REVIEW`, disparada al enviar
 * el expediente. Esta consola muestra su veredicto y enlaza a la ejecución y al caso. El formulario
 * de aprobar/rechazar sólo aparece cuando el Motor NO abrió caso —una decisión automática suya, o
 * el Motor caído cuando se envió—: `decide` responde 409 `PARTNER_DECISION_DELEGADA_AL_MOTOR` en
 * cuanto hay caso, y se corta en el servicio del backend porque una pantalla se salta con curl.
 *
 * ## Y ya no se fija la comisión
 *
 * `PATCH /operations/partners/:id/mdr-rate` se retiró del backend. El MDR es un término comercial y
 * su sitio es el ERP, que ya lo modela con más detalle (`atlas_sales.mdr_rules` por cuenta y por
 * sucursal, `expected_mdr_rate` de la oportunidad, términos de contrato de tipo `MDR`). Tener
 * además un porcentaje plano aquí daba dos respuestas distintas a la misma pregunta, y ganaba la
 * de quien consultara primero.
 */
export function listPartnerQueue(query: QueryParams) {
  return apiRequest<PartnerQueueResponse>("/operations/partners/queue", {
    query,
  });
}

export function getPartnerStatus(partnerId: string) {
  return apiRequest<JsonRecord>(
    `/partner-onboarding/${encodeURIComponent(partnerId)}/status`,
  );
}

/**
 * Pide al Motor que verifique el expediente. Es el MISMO camino que dispara el envío del comercio:
 * existe para reintentar tras subir lo que faltaba, sin que haya una segunda forma de decidir.
 */
export function requestKybReview(partnerId: string, reason?: string) {
  return apiRequest<JsonRecord>(
    `/operations/partners/${encodeURIComponent(partnerId)}/kyb-review`,
    { method: "POST", body: reason ? { reason } : {} },
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
