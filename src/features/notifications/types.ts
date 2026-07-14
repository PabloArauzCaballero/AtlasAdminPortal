export type NotificationChannel =
  "in_app" | "push" | "email" | "sms" | "whatsapp" | "phone";

export type NotificationStatus =
  | "pending"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "retrying"
  | "cancelled";

export type NotificationDeliveryStatus =
  "sent" | "delivered" | "failed" | "skipped";

export type NotificationDelivery = {
  id: string;
  notificationMessageId: string;
  channel: NotificationChannel;
  provider: string;
  providerMessageId: string | null;
  status: NotificationDeliveryStatus;
  attemptNumber: number;
  errorCode: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
};

export type NotificationMessage = {
  id: string;
  tenantId: string | null;
  outboxEventId: string | null;
  recipientType: string;
  recipientId: string;
  channel: NotificationChannel;
  templateCode: string | null;
  subject: string | null;
  title: string | null;
  body: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  priority: number;
  category: string | null;
  icon: string | null;
  scheduledAt: string | null;
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  correlationId: string | null;
  causationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationMessageDetail = NotificationMessage & {
  deliveries: NotificationDelivery[];
};

export type NotificationTemplate = {
  id: string;
  tenantId: string | null;
  code: string;
  channel: NotificationChannel;
  locale: string;
  titleTemplate: string | null;
  subjectTemplate: string | null;
  bodyTemplate: string;
  payloadSchema: Record<string, unknown> | null;
  category: string | null;
  icon: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateNotificationTemplateInput = {
  code: string;
  channel: NotificationChannel;
  locale?: string;
  titleTemplate?: string | null;
  subjectTemplate?: string | null;
  bodyTemplate: string;
  payloadSchema?: Record<string, unknown> | null;
  category?: string | null;
  icon?: string | null;
  isActive?: boolean;
  version?: number;
};

export type UpdateNotificationTemplateInput =
  Partial<CreateNotificationTemplateInput>;

export type BroadcastAudience = "customers" | "internal_users" | "both";

export type CreateBroadcastNotificationInput = {
  title: string;
  body: string;
  priority?: number;
  category?: string;
  icon?: string | null;
  audience: BroadcastAudience;
  customerIds?: string[];
  internalUserIds?: string[];
};

export type BroadcastResult = {
  broadcastId: string;
  targeted: number;
  created: number;
};

export type NotificationPreference = {
  id: string;
  customerId: string;
  eventCode: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PreferenceInput = {
  eventCode: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  isRequired?: boolean;
};

export type UpdatePreferencesInput = {
  preferences: PreferenceInput[];
};
