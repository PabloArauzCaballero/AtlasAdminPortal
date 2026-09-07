import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  MerchantProvisioningList,
  MerchantProvisioningRequest,
  MerchantProvisioningResult,
  MerchantUserList,
  MerchantUserProfile,
} from "./types";

/**
 * Identidades del canal del comercio.
 *
 * ## El alta libre se retiró, y es lo importante de este archivo
 *
 * Había un `POST /merchant/users` que creaba una identidad con el correo, el nombre y la contraseña
 * TECLEADOS en esta consola. Con eso el portal interno era el ORIGEN de un usuario de comercio, y
 * el origen no le pertenece: la relación comercial se firma en el ERP, y es allí donde están la
 * cuenta B2B, la sucursal y el rol de esa persona. La consecuencia práctica era que el alta del ERP
 * y la identidad de Atlas no se conocían: bastaba un carácter de diferencia en el correo para que
 * el enlace preferente quedara vacío y la persona iniciara sesión sin alcance ninguno.
 *
 * Ahora el ERP ENCOLA la petición y esta consola la CONCEDE o la RECHAZA. La ruta de alta directa
 * ya no existe en el backend, así que no queda una segunda puerta que saltarse con `curl`.
 *
 * No confundir con los usuarios de comercio del ERP: allí vive a QUÉ comercio pertenece cada uno y
 * con qué alcance; aquí, quién es y cómo inicia sesión. Son dos bases distintas a propósito.
 */
export function listMerchantUsers(query: QueryParams) {
  return apiRequest<MerchantUserList>("/merchant/users", { query });
}

export function setMerchantUserStatus(
  merchantUserId: string,
  body: { status: string; reason?: string },
) {
  return apiRequest<MerchantUserProfile>(
    `/merchant/users/${merchantUserId}/status`,
    { method: "PATCH", body },
  );
}

/** La cola: lo que el ERP ha pedido y todavía nadie ha resuelto. */
export function listProvisioningRequests(query: QueryParams) {
  return apiRequest<MerchantProvisioningList>(
    "/merchant/users/provisioning-requests",
    { query },
  );
}

/**
 * Conceder el acceso pedido.
 *
 * No se le pasan los datos de la persona: los toma el backend de la petición. Poder reescribirlos
 * aquí devolvería el problema que la cola resuelve, con el agravante de que la petición diría una
 * cosa y la identidad concedida otra. `userCode` sí, porque es un dato de Atlas y no del ERP.
 */
export function approveProvisioningRequest(
  requestId: string,
  body: { userCode?: string },
) {
  return apiRequest<MerchantProvisioningResult>(
    `/merchant/users/provisioning-requests/${requestId}/approve`,
    { method: "POST", body },
  );
}

/** Rechazar, con motivo obligatorio: es lo que el ERP lee para saber qué corregir. */
export function rejectProvisioningRequest(
  requestId: string,
  body: { reason: string },
) {
  return apiRequest<MerchantProvisioningRequest>(
    `/merchant/users/provisioning-requests/${requestId}/reject`,
    { method: "POST", body },
  );
}
