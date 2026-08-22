export type NotificationChannel = "push" | "email" | "sms" | "in_app" | "whatsapp";

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

export type NotificationPolicyList = { data: NotificationPolicy[] };

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
