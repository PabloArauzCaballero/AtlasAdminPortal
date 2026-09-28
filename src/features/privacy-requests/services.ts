import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  PrivacyRequestDetail,
  PrivacyRequestList,
  PrivacyTransitionTarget,
} from "./types";

const BASE = "/operations/privacy/data-subject-requests";

/** La cola de todo el tenant; exige `privacy.requests.read`. */
export function listPrivacyRequests(query: QueryParams) {
  return apiRequest<PrivacyRequestList>(BASE, { query });
}

export function getPrivacyRequest(requestId: string) {
  return apiRequest<PrivacyRequestDetail>(
    `${BASE}/${encodeURIComponent(requestId)}`,
  );
}

/**
 * Mover la solicitud un paso: tomarla, completarla o rechazarla. Exige `privacy.requests.manage`.
 *
 * Completar NO borra nada: deja constancia de que una persona atendió el pedido. Si el pedido era
 * una supresión, el borrado se hace a mano, respetando lo que la ley obliga a conservar.
 */
export function transitionPrivacyRequest(
  requestId: string,
  body: { toStatus: PrivacyTransitionTarget; reason?: string },
) {
  return apiRequest<PrivacyRequestDetail>(
    `${BASE}/${encodeURIComponent(requestId)}/transition`,
    { method: "POST", body },
  );
}
