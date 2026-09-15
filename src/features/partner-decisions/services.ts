import { apiRequest } from "@/shared/api/client";
import { apiDownload } from "@/shared/api/download";
import type { JsonRecord, QueryParams } from "@/shared/api/types";
import type { PartnerQrPendingResponse, PartnerQrReviewed } from "./types";
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

/**
 * La cola de QR de cobro esperando revisión.
 *
 * Es una cola aparte de la de expedientes: un comercio ya aprobado sube o cambia su QR cuando
 * quiere, y hasta que una persona lo aprueba la app del cliente NO lo enseña. Hasta el 2026-09-14
 * ningún QR salía de `pending_review` porque no existía esta pantalla ni su ruta.
 */
export function listQrPendingReview() {
  return apiRequest<PartnerQrPendingResponse>(
    "/operations/partners/qr-codes/pending",
  );
}

/** Aprobar activa el QR (y archiva el activo anterior); rechazar exige `note`. */
export function reviewPartnerQr(
  partnerId: string,
  qrId: string,
  body: { approved: boolean; note?: string },
) {
  return apiRequest<PartnerQrReviewed>(
    `/operations/partners/${encodeURIComponent(partnerId)}/qr-codes/${encodeURIComponent(qrId)}/review`,
    { method: "POST", body },
  );
}

/**
 * La imagen del QR, como blob: un `<img src>` no manda `Authorization` y el backend respondería
 * 401. Mismo patrón que el visor del expediente.
 */
export function downloadPartnerQrImage(partnerId: string, qrId: string) {
  return apiDownload(
    `/partner-onboarding/${encodeURIComponent(partnerId)}/qr-codes/${encodeURIComponent(qrId)}/content`,
    `qr-${qrId}.png`,
  );
}
