"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  decideFraudCase,
  decideManualReviewCase,
  getInvestigationSummary,
  listWorkQueue,
} from "./services";
import type { FraudDecisionInput, ManualReviewDecisionInput } from "./types";

export function useWorkQueue(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.workQueue(query),
    queryFn: () => listWorkQueue(query),
  });
}

export function useDecideManualReviewCaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { caseId: string; body: ManualReviewDecisionInput }) =>
      decideManualReviewCase(input.caseId, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["operations", "work-queue"],
      });
    },
  });
}

export function useDecideFraudCaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { caseId: string; body: FraudDecisionInput }) =>
      decideFraudCase(input.caseId, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["operations", "work-queue"],
      });
    },
  });
}

export function useInvestigationSummary(customerId: string) {
  return useQuery({
    queryKey: queryKeys.investigationSummary(customerId),
    queryFn: () => getInvestigationSummary(customerId),
    enabled: Boolean(customerId),
  });
}
