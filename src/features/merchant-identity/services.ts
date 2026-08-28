import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { MerchantUserList, MerchantUserProfile } from "./types";

/**
 * Identidades del canal del comercio.
 *
 * Las cuatro rutas de `/merchant/users` existían sin pantalla, y el efecto era que **un comercio
 * afiliado no podía recibir un acceso**: crear la identidad de su personal sólo se podía por
 * semilla o por `curl`. El propio controlador lo dice: «no es el portal del comercio; aquí no entra
 * un comercio», es la contraparte de identidad del onboarding que hace el personal interno.
 *
 * No confundir con los usuarios de comercio del ERP: allí vive a QUÉ comercio pertenece cada uno y
 * con qué alcance; aquí, quién es y cómo inicia sesión. Son dos bases distintas a propósito.
 */
export function listMerchantUsers(query: QueryParams) {
  return apiRequest<MerchantUserList>("/merchant/users", { query });
}

/*
 * `GET /merchant/users/:id` existe y no se envuelve aquí: el listado ya devuelve el perfil entero
 * de cada identidad, así que pedirlo de uno en uno sería una función sin llamador. Se añade el día
 * que haya una ficha que necesite algo que la lista no trae.
 */

/**
 * El tenant NO viaja en el cuerpo: sale del token del operador. Mandarlo desde el cliente
 * permitiría dar de alta identidades en un inquilino ajeno con un token válido del propio.
 */
export function createMerchantUser(body: {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  userCode?: string;
}) {
  return apiRequest<MerchantUserProfile>("/merchant/users", {
    method: "POST",
    body,
  });
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
