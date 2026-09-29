import { apiRequest } from "@/shared/api/client";
import type {
  NotificationPolicyList,
  NotificationPolicyQuery,
  NotificationPolicyUpsert,
} from "./types";

/** El listado paginado del portal: el buscador y los filtros viajan al servidor. */
export function listNotificationPolicies(query: NotificationPolicyQuery = {}) {
  return apiRequest<NotificationPolicyList>(
    "/operations/notification-policies",
    {
      query: {
        page: query.page,
        limit: query.limit,
        q: query.q?.trim() || undefined,
        category: query.category || undefined,
        channel: query.channel || undefined,
        mandatory: query.mandatory || undefined,
        active: query.active || undefined,
      },
    },
  );
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
