"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import {
  getCustomerCardTier,
  revokeCustomerCardTier,
  setCustomerCardTier,
} from "./card-tier-services";
import type { RevokeCardTierBody, SetCardTierBody } from "./card-tier-types";

export function useCustomerCardTier(customerId: string) {
  return useQuery({
    queryKey: queryKeys.customerCardTier(customerId),
    queryFn: () => getCustomerCardTier(customerId),
    enabled: Boolean(customerId),
  });
}

/** Tras poner o quitar una tarjeta, la respuesta ya trae el estado nuevo: se escribe en caché sin otra ida. */
function useStoreResult(customerId: string) {
  const queryClient = useQueryClient();
  return (data: Awaited<ReturnType<typeof getCustomerCardTier>>) =>
    queryClient.setQueryData(queryKeys.customerCardTier(customerId), data);
}

export function useSetCardTierMutation(customerId: string) {
  const store = useStoreResult(customerId);
  return useMutation({
    mutationFn: (body: SetCardTierBody) =>
      setCustomerCardTier(customerId, body),
    onSuccess: store,
  });
}

export function useRevokeCardTierMutation(customerId: string) {
  const store = useStoreResult(customerId);
  return useMutation({
    mutationFn: (body: RevokeCardTierBody) =>
      revokeCustomerCardTier(customerId, body),
    onSuccess: store,
  });
}
