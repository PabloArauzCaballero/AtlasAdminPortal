"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  activateKillSwitch,
  approveRequest,
  getAuthBrokerAvailability,
  getPendingRotation,
  getProviderAuthStates,
  invalidateProviderToken,
  revokeProviderCredential,
  rotateProviderCredential,
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
  RotateCredentialInput,
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

/**
 * Disponibilidad del broker de autenticación.
 *
 * Se consulta siempre y nunca falla: es lo que decide si el resto de la vista de autenticación
 * tiene sentido. Sin este dato, un despliegue que aún no delega la autenticación mostraría un
 * error rojo permanente en vez de "no configurado", que son cosas distintas.
 */
export function useAuthBrokerAvailability() {
  return useQuery({
    queryKey: queryKeys.authBrokerAvailability,
    queryFn: () => getAuthBrokerAvailability(),
  });
}

/** Solo se pide si el broker está configurado: si no, el backend responde 503 por diseño. */
export function useProviderAuthStates(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.externalProvidersAuthState,
    queryFn: () => getProviderAuthStates().then((body) => body.providers),
    enabled,
  });
}

export function usePendingRotation(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.externalProvidersPendingRotation,
    queryFn: () => getPendingRotation().then((body) => body.credentials),
    enabled,
  });
}

function invalidateAuthState(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    queryKey: ["external-providers"],
  });
}

export function useRotateCredentialMutation(providerCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RotateCredentialInput) =>
      rotateProviderCredential(providerCode, body),
    onSuccess: () => invalidateAuthState(queryClient),
  });
}

export function useRevokeCredentialMutation(providerCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      revokeProviderCredential(providerCode, reason),
    onSuccess: () => invalidateAuthState(queryClient),
  });
}

export function useInvalidateTokenMutation(providerCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invalidateProviderToken(providerCode),
    onSuccess: () => invalidateAuthState(queryClient),
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
