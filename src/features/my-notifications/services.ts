import { apiRequest } from "@/shared/api/client";
import type {
  PaginatedResponse,
  PaginationMeta,
  QueryParams,
} from "@/shared/api/types";
import type { NotificationMessage } from "@/features/notifications/types";

// A diferencia de `/operations/notifications/messages` y `/templates` (que pagina con `meta`),
// este endpoint de autoservicio pagina con la clave `pagination` (ver
// AtlasBackend/src/modules/notifications/notifications.service.ts#listMyNotifications).
type BackendPage<T> = { data: T[]; pagination: PaginationMeta };

function toPaginated<T>(response: BackendPage<T>): PaginatedResponse<T> {
  return { items: response.data, meta: response.pagination };
}

// Autoservicio: recipientId siempre sale del token en el backend (currentUser.internalUserId),
// nunca se manda desde acá — cada usuario interno solo puede ver/marcar SU propio inbox.
export async function listMyNotifications(
  query: QueryParams,
): Promise<PaginatedResponse<NotificationMessage>> {
  const response = await apiRequest<BackendPage<NotificationMessage>>(
    "/internal-users/me/notifications",
    { query },
  );
  return toPaginated(response);
}

export function getMyUnreadNotificationsCount() {
  return apiRequest<{ unread: number }>(
    "/internal-users/me/notifications/unread-count",
  );
}

export function markMyNotificationRead(notificationId: string) {
  return apiRequest<NotificationMessage>(
    `/internal-users/me/notifications/${notificationId}/read`,
    { method: "POST" },
  );
}

export function markAllMyNotificationsRead() {
  return apiRequest<{ updated: number }>(
    "/internal-users/me/notifications/read-all",
    { method: "POST" },
  );
}
