"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JsonRecord } from "@/shared/api/types";
import {
  createDataRequest,
  getCustomerDataset,
  getDataRequest,
  getDigitalTrustProfile,
  getFacebookConnectUrl,
  getFacebookStatus,
  getProvidersHealth,
  grantConsent,
  listCustomerConsents,
  previewDataRequest,
  revokeConsent,
  runDigitalTrustCheck,
  type CustomerDataset,
} from "./services";

const RAIZ = ["external-data"] as const;

export function useCustomerConsents(customerId: string) {
  return useQuery({
    queryKey: [...RAIZ, "consents", customerId],
    queryFn: () => listCustomerConsents(customerId),
    enabled: Boolean(customerId),
    retry: false,
  });
}

export function useCustomerDataset(customerId: string, dataset: CustomerDataset) {
  return useQuery({
    queryKey: [...RAIZ, "dataset", customerId, dataset],
    queryFn: () => getCustomerDataset(customerId, dataset),
    enabled: Boolean(customerId),
    retry: false,
  });
}

export function useProvidersHealth() {
  return useQuery({
    queryKey: [...RAIZ, "providers-health"],
    queryFn: () => getProvidersHealth(),
  });
}

export function useDigitalTrustProfile(customerId: string) {
  return useQuery({
    queryKey: [...RAIZ, "digital-trust", customerId],
    queryFn: () => getDigitalTrustProfile(customerId),
    enabled: Boolean(customerId),
    retry: false,
  });
}

export function useFacebookStatus(customerId: string) {
  return useQuery({
    queryKey: [...RAIZ, "facebook", customerId],
    queryFn: () => getFacebookStatus(customerId),
    enabled: Boolean(customerId),
    retry: false,
  });
}

export function useDataRequest(requestId: string) {
  return useQuery({
    queryKey: [...RAIZ, "request", requestId],
    queryFn: () => getDataRequest(requestId),
    enabled: Boolean(requestId),
    retry: false,
  });
}

function useExternalMutation<TInput, TResult>(
  accion: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RAIZ });
    },
  });
}

export function useGrantConsentMutation() {
  return useExternalMutation(
    (input: { customerId: string; purpose: string; providerCode?: string; accepted: boolean }) =>
      grantConsent(input),
  );
}

export function useRevokeConsentMutation() {
  return useExternalMutation((consentId: string) => revokeConsent(consentId));
}

/** La vista previa NO invalida nada: no cambia estado, sólo dice qué costaría. */
export function usePreviewRequestMutation() {
  return useMutation({ mutationFn: (body: JsonRecord) => previewDataRequest(body) });
}

export function useCreateRequestMutation() {
  return useExternalMutation((body: JsonRecord) => createDataRequest(body));
}

export function useDigitalTrustCheckMutation() {
  return useExternalMutation(
    (input: { customerId: string; email?: string; phoneNumber?: string }) =>
      runDigitalTrustCheck(input),
  );
}

export function useFacebookConnectUrlMutation() {
  return useMutation({
    mutationFn: (customerId: string) => getFacebookConnectUrl(customerId),
  });
}
