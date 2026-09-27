import type { NotificationMessage } from "@/features/notifications/types";

/** Los estados de una campaña, con el vocabulario del servidor (no cambian). */
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

export type CampaignChannel = "in_app" | "push" | "email";

export type AudienceRule = {
  attribute: string;
  operator: string;
  value?: string | number | string[];
};

export type AudienceDefinition = {
  match: "all" | "any";
  rules: AudienceRule[];
};

export type AudienceEstimate = {
  total: number;
  withPushDevice: number;
  withVerifiedEmail: number;
  estimatedAt: string;
};

export type CampaignTotals = {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  cancelled: number;
  read: number;
};

export type CampaignChannelMetrics = CampaignTotals & { channel: string };

export type NotificationCampaign = {
  id: string;
  campaignUuid: string;
  name: string;
  purpose: "marketing" | "operational";
  status: CampaignStatus;
  title: string;
  body: string;
  category: string;
  icon: string | null;
  deepLink: string | null;
  channels: CampaignChannel[];
  audienceSegmentId: string | null;
  audience: AudienceDefinition | null;
  audienceEstimate: AudienceEstimate | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  ratePerMinute: number | null;
  maxRecipients: number | null;
  targetedCount: number | null;
  createdCount: number | null;
  materializedAt: string | null;
  createdBy: string | null;
  scheduledBy: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  finishedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  /** Sólo en el detalle: el listado no las calcula. */
  metrics?: { totals: CampaignTotals; channels: CampaignChannelMetrics[] };
};

export type AudienceSegment = {
  id: string;
  name: string;
  description: string | null;
  definition: AudienceDefinition | null;
  lastEstimate: AudienceEstimate | null;
  lastEstimatedAt: string | null;
  status: "active" | "archived";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignMessage = NotificationMessage;

export type CampaignAction = "pause" | "resume" | "cancel";
