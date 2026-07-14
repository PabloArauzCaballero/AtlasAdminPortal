"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  activateKillSwitch,
  approveRequest,
  getIdempotencyAudit,
  getProductionGate,
  getProviderCostPolicies,
  getProviderHealth,
  getQualityAudit,
  getReadiness,
  getRetentionPreview,
  getSanitizationAudit,
  getSla,
  getUsage,
  listProviders,
  patchProviderRuntime,
  previewPolicy,
  rebuildFeatures,
  retryRequest,
  testProvider,
  updateProviderCostPolicy,
} from "./services";
import type {
  ApproveProviderRequestInput,
  CostPolicyPatchInput,
  PolicyPreviewInput,
  ProviderRuntimePatchInput,
  RetryRequestInput,
  TestProviderInput,
} from "./types";

function invalidateProviders(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["external-providers"] });
}

export function useProviders() {
  return useQuery({
    queryKey: queryKeys.externalProviders,
    queryFn: () => listProviders(),
  });
}

export function useProviderHealth() {
  return useQuery({
    queryKey: queryKeys.externalProvidersHealth,
    queryFn: () => getProviderHealth(),
  });
}

export function useProviderCostPolicies(providerCode: string) {
  return useQuery({
    queryKey: queryKeys.providerCostPolicies(providerCode),
    queryFn: () => getProviderCostPolicies(providerCode),
    enabled: Boolean(providerCode),
  });
}

export function usePatchProviderRuntimeMutation(providerCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProviderRuntimePatchInput) =>
      patchProviderRuntime(providerCode, body),
    onSuccess: () => invalidateProviders(queryClient),
  });
}

export function useKillSwitchMutation(providerCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => activateKillSwitch(providerCode, reason),
    onSuccess: () => invalidateProviders(queryClient),
  });
}

export function useUpdateCostPolicyMutation(providerCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { queryType: string; body: CostPolicyPatchInput }) =>
      updateProviderCostPolicy(providerCode, input.queryType, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.providerCostPolicies(providerCode),
      });
    },
  });
}

export function useTestProviderMutation(providerCode: string) {
  return useMutation({
    mutationFn: (body: TestProviderInput) => testProvider(providerCode, body),
  });
}

export function useQualityAudit() {
  return useQuery({
    queryKey: queryKeys.externalProvidersReport("quality-audit"),
    queryFn: () => getQualityAudit(),
  });
}

export function useProductionGate(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.externalProvidersReport("production-gate", query),
    queryFn: () => getProductionGate(query),
  });
}

export function useReadiness() {
  return useQuery({
    queryKey: queryKeys.externalProvidersReport("readiness"),
    queryFn: () => getReadiness(),
  });
}

export function useSlaReport(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.externalProvidersReport("sla", query),
    queryFn: () => getSla(query),
  });
}

export function useUsageReport(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.externalProvidersReport("usage", query),
    queryFn: () => getUsage(query),
  });
}

export function useIdempotencyAudit(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.externalProvidersReport("idempotency-audit", query),
    queryFn: () => getIdempotencyAudit(query),
  });
}

export function useRetentionPreview(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.externalProvidersReport("retention-preview", query),
    queryFn: () => getRetentionPreview(query),
  });
}

export function useSanitizationAudit(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.externalProvidersReport("sanitization-audit", query),
    queryFn: () => getSanitizationAudit(query),
  });
}

export function useApproveRequestMutation() {
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      body: ApproveProviderRequestInput;
    }) => approveRequest(input.requestId, input.body),
  });
}

export function useRetryRequestMutation() {
  return useMutation({
    mutationFn: (input: { requestId: string; body: RetryRequestInput }) =>
      retryRequest(input.requestId, input.body),
  });
}

export function useRebuildFeaturesMutation() {
  return useMutation({
    mutationFn: (requestId: string) => rebuildFeatures(requestId),
  });
}

export function usePolicyPreviewMutation() {
  return useMutation({
    mutationFn: (body: PolicyPreviewInput) => previewPolicy(body),
  });
}
