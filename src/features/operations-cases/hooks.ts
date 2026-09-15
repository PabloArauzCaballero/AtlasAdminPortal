"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  decideFraudCase,
  decideIdentityVerification,
  decideManualReviewCase,
  downloadEvidenceDocument,
  getInvestigationSummary,
  listEvidenceDocuments,
  listWorkQueue,
} from "./services";
import type {
  FraudDecisionInput,
  IdentityDecisionInput,
  ManualReviewDecisionInput,
} from "./types";

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

export function useEvidenceDocuments(customerId: string) {
  return useQuery({
    queryKey: ["operations", "evidence-documents", customerId] as const,
    queryFn: () => listEvidenceDocuments(customerId),
    enabled: Boolean(customerId),
  });
}

/** Los bytes de UN documento, como blob. `staleTime: Infinity`: una imagen de carnet no cambia. */
export function useEvidenceDocumentContent(
  customerId: string,
  documentId: string,
) {
  return useQuery({
    queryKey: [
      "operations",
      "evidence-document",
      customerId,
      documentId,
    ] as const,
    queryFn: () => downloadEvidenceDocument(customerId, documentId),
    enabled: Boolean(customerId) && Boolean(documentId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useDecideIdentityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { customerId: string; body: IdentityDecisionInput }) =>
      decideIdentityVerification(input.customerId, input.body),
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.investigationSummary(input.customerId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["operations", "work-queue"],
        }),
      ]);
    },
  });
}
