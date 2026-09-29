import type { PaginationMeta } from "@/shared/api/types";

export type NotificationChannel =
  "push" | "email" | "sms" | "in_app" | "whatsapp";

export type NotificationPolicy = {
  policyId: string;
  eventCode: string;
  channel: NotificationChannel;
  label: string;
  description: string | null;
  category: string;
  icon: string | null;
  /** Irrenunciable: la app lo pinta con candado y el servidor rechaza apagarlo. */
  isMandatory: boolean;
  defaultEnabled: boolean;
  /** Por qué no se puede apagar, dicho para el cliente. Obligatorio si `isMandatory`. */
  mandatoryReason: string | null;
  displayOrder: number;
  isActive: boolean;
  updatedAt: string | null;
};

/**
 * Las cifras del catálogo ENTERO del tenant: no cambian con el buscador, los filtros ni la página.
 * Un Core anterior a la paginación no las manda; la pantalla lo tolera y no pinta las tarjetas.
 */
export type NotificationPolicySummary = {
  total: number;
  mandatory: number;
  active: number;
  inactive: number;
  byChannel: Partial<Record<NotificationChannel, number>>;
  byCategory: Array<{ category: string; count: number }>;
};

export type NotificationPolicyList = {
  data: NotificationPolicy[];
  meta?: PaginationMeta;
  summary?: NotificationPolicySummary;
};

/** Lo que viaja al servidor: el buscador, los cuatro filtros y la página. */
export type NotificationPolicyQuery = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  channel?: NotificationChannel | "";
  mandatory?: "true" | "false" | "";
  active?: "true" | "false" | "";
};

export type NotificationPolicyUpsert = {
  eventCode: string;
  channel: NotificationChannel;
  label: string;
  description?: string | null;
  category?: string;
  icon?: string | null;
  isMandatory?: boolean;
  defaultEnabled?: boolean;
  mandatoryReason?: string | null;
  displayOrder?: number;
  isActive?: boolean;
};
