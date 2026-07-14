import type { PaginatedResponse } from "@/shared/api/types";
import type { NotificationMessage } from "@/features/notifications/types";

export type MyNotificationsListResponse =
  PaginatedResponse<NotificationMessage>;

export type UnreadCountResult = { unread: number };

export type MarkAllReadResult = { updated: number };
