"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { listFlowReviewQueue, reviewFlow } from "./services";
import type { FlowReviewDecision } from "./types";

export function useFlowReviewQueue(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.flowReviewQueue(query),
    queryFn: () => listFlowReviewQueue(query),
  });
}

export function useReviewFlowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { flowId: string; body: FlowReviewDecision }) =>
      reviewFlow(input.flowId, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["systems", "flows-review-queue"],
      });
      await queryClient.invalidateQueries({ queryKey: ["systems", "flow"] });
    },
  });
}
