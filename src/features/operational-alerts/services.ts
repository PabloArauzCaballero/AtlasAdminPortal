import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { AlertActionResult, AlertListResponse } from "./types";

export function listAlerts(query: QueryParams) {
  return apiRequest<AlertListResponse>("/internal/alerts", { query });
}

export function acknowledgeAlert(alertId: string) {
  return apiRequest<AlertActionResult>(
    `/internal/alerts/${alertId}/acknowledge`,
    {
      method: "POST",
    },
  );
}
