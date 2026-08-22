import { apiRequest } from "@/shared/api/client";
import type { NotificationPolicyList, NotificationPolicyUpsert } from "./types";

export function listNotificationPolicies() {
  return apiRequest<NotificationPolicyList>("/operations/notification-policies");
}

/**
 * Crear y editar son la MISMA operacion, resuelta por `eventCode` + `channel`.
 *
 * Separarlas obligaria a esta pantalla a saber si la politica ya existe, y equivocarse crearia una
 * segunda politica para el mismo aviso — con la posibilidad de que una diga obligatorio y la otra no.
 */
export function saveNotificationPolicy(body: NotificationPolicyUpsert) {
  return apiRequest<unknown>("/operations/notification-policies", {
    method: "PUT",
    body,
  });
}
