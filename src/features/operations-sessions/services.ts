import { apiRequest } from "@/shared/api/client";
import type { SessionInvestigationSummary } from "./types";

export function getSessionInvestigationSummary(sessionId: string) {
  return apiRequest<SessionInvestigationSummary>(
    `/operations/sessions/${sessionId}/investigation-summary`,
  );
}
