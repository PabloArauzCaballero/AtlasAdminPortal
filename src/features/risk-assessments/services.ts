import { apiRequest } from "@/shared/api/client";
import type { RiskAssessmentDetail, RiskAssessmentExplanation } from "./types";

export function getRiskAssessment(runId: string) {
  return apiRequest<RiskAssessmentDetail>(
    `/operations/risk-assessments/${runId}`,
  );
}

export function getRiskAssessmentExplanation(runId: string) {
  return apiRequest<RiskAssessmentExplanation>(
    `/operations/risk-assessments/${runId}/explanation`,
  );
}
