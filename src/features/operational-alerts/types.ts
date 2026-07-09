import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type OperationalAlert = {
  alertId: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  source: string | null;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  metadata?: JsonRecord | null;
};

export type AlertActionResult = {
  alertId: string;
  status: string;
  message?: string | null;
};

export type AlertListResponse = PaginatedResponse<OperationalAlert>;
