import { apiRequest } from "@/shared/api/client";
import type {
  PaginatedResponse,
  PaginationMeta,
  QueryParams,
} from "@/shared/api/types";
import type {
  BroadcastResult,
  CreateBroadcastNotificationInput,
  CreateNotificationTemplateInput,
  NotificationMessage,
  NotificationMessageDetail,
  NotificationPreference,
  NotificationTemplate,
  UpdateNotificationTemplateInput,
  UpdatePreferencesInput,
} from "./types";

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// El backend pagina con las claves `data`/`pagination` (no `items`/`meta` — confirmado contra
// NotificationsService.listMessages/listTemplates en AtlasBackend). Antes esto leía
// `response.meta`, que el backend nunca envía: la paginación quedaba rota en silencio (sin
// controles de página, sin error visible) en vez de fallar de forma evidente.
type BackendPage<T> = { data: T[]; pagination: PaginationMeta };

function toPaginated<T>(response: BackendPage<T>): PaginatedResponse<T> {
  return { items: response.data, meta: response.pagination };
}

export async function listNotificationMessages(
  query: QueryParams,
): Promise<PaginatedResponse<NotificationMessage>> {
  const response = await apiRequest<BackendPage<NotificationMessage>>(
    "/operations/notifications/messages",
    { query },
  );
  return toPaginated(response);
}

export function getNotificationMessage(messageId: string) {
  return apiRequest<NotificationMessageDetail>(
    `/operations/notifications/messages/${messageId}`,
  );
}

export function retryNotificationMessage(messageId: string) {
  return apiRequest<NotificationMessage>(
    `/operations/notifications/messages/${messageId}/retry`,
    {
      method: "POST",
      headers: { "x-idempotency-key": idempotencyKey("notif-retry") },
    },
  );
}

export function cancelNotificationMessage(messageId: string) {
  return apiRequest<NotificationMessage>(
    `/operations/notifications/messages/${messageId}/cancel`,
    {
      method: "POST",
      headers: { "x-idempotency-key": idempotencyKey("notif-cancel") },
    },
  );
}

export async function listNotificationTemplates(
  query: QueryParams,
): Promise<PaginatedResponse<NotificationTemplate>> {
  const response = await apiRequest<BackendPage<NotificationTemplate>>(
    "/operations/notifications/templates",
    { query },
  );
  return toPaginated(response);
}

export function createNotificationTemplate(
  body: CreateNotificationTemplateInput,
) {
  return apiRequest<NotificationTemplate>(
    "/operations/notifications/templates",
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("notif-template-create") },
    },
  );
}

export function updateNotificationTemplate(
  templateId: string,
  body: UpdateNotificationTemplateInput,
) {
  return apiRequest<NotificationTemplate>(
    `/operations/notifications/templates/${templateId}`,
    {
      method: "PATCH",
      body,
      headers: { "x-idempotency-key": idempotencyKey("notif-template-update") },
    },
  );
}

// El backend crea (bulkCreate) y entrega de verdad cada mensaje in-app, uno por destinatario
// resuelto — no es un mock ni una simulación. `x-tenant-id` lo agrega automáticamente el cliente
// API (ver shared/api/request-init.ts); solo hace falta la idempotency key de esta mutación.
export function sendBroadcastNotification(
  body: CreateBroadcastNotificationInput,
) {
  return apiRequest<BroadcastResult>("/operations/notifications/broadcast", {
    method: "POST",
    body,
    headers: { "x-idempotency-key": idempotencyKey("notif-broadcast") },
  });
}

export async function getCustomerPreferences(
  customerId: string,
): Promise<NotificationPreference[]> {
  const response = await apiRequest<{ data: NotificationPreference[] }>(
    `/operations/notifications/preferences/${customerId}`,
  );
  return response.data;
}

export async function updateCustomerPreferences(
  customerId: string,
  body: UpdatePreferencesInput,
): Promise<NotificationPreference[]> {
  const response = await apiRequest<{ data: NotificationPreference[] }>(
    `/operations/notifications/preferences/${customerId}`,
    {
      method: "PATCH",
      body,
      headers: { "x-idempotency-key": idempotencyKey("notif-preferences") },
    },
  );
  return response.data;
}
