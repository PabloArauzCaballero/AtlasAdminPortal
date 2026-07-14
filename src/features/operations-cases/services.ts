import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  FraudDecisionInput,
  FraudDecisionResult,
  InvestigationSummary,
  ManualReviewDecisionInput,
  ManualReviewDecisionResult,
  WorkQueueListResponse,
} from "./types";

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function listWorkQueue(query: QueryParams) {
  return apiRequest<WorkQueueListResponse>("/operations/work-queue", {
    query,
  });
}

export function decideManualReviewCase(
  caseId: string,
  body: ManualReviewDecisionInput,
) {
  return apiRequest<ManualReviewDecisionResult>(
    `/operations/manual-review-cases/${caseId}/decision`,
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("manual-review-decide") },
    },
  );
}

export function decideFraudCase(caseId: string, body: FraudDecisionInput) {
  return apiRequest<FraudDecisionResult>(
    `/operations/fraud-cases/${caseId}/decision`,
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("fraud-case-decide") },
    },
  );
}

export function getInvestigationSummary(customerId: string) {
  return apiRequest<InvestigationSummary>(
    `/operations/customers/${customerId}/investigation-summary`,
  );
}
