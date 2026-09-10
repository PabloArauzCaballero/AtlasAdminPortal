import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import { normalizePaginatedResponse } from "@/features/systems/normalizers";
import { compactQuery } from "../services";
import type {
  FlowReviewDecision,
  FlowReviewItem,
  FlowReviewQueueResponse,
} from "./types";

export async function listFlowReviewQueue(
  query: QueryParams,
): Promise<FlowReviewQueueResponse> {
  const response = await apiRequest<unknown>("/systems/flows/review-queue", {
    query: compactQuery(query),
  });
  return normalizePaginatedResponse<FlowReviewItem>(response, ["items"]);
}

export function reviewFlow(flowId: string, body: FlowReviewDecision) {
  return apiRequest<unknown>(`/systems/flows/${flowId}/review`, {
    method: "PATCH",
    body,
  });
}
