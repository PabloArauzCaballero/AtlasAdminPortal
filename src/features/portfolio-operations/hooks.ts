"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import { queryKeys } from "@/shared/api/query-keys";
import {
  getOutcomeDeliveryStatus,
  getPortfolioSummary,
  getRatingScale,
  listExhaustedOutcomes,
  rateCustomer,
  rateLoan,
  sweepRatings,
} from "./services";

const RAIZ = ["operations", "portfolio"] as const;

export function usePortfolioSummary() {
  return useQuery({
    queryKey: [...RAIZ, "summary"],
    queryFn: () => getPortfolioSummary(),
  });
}

export function useOutcomeDeliveryStatus() {
  return useQuery({
    queryKey: [...RAIZ, "outcome-status"],
    queryFn: () => getOutcomeDeliveryStatus(),
  });
}

/** `enabled: false` para quien el backend no deja leer la lista: no se pide para recibir un 403. */
export function useExhaustedOutcomes(query: QueryParams, enabled = true) {
  return useQuery({
    queryKey: [...RAIZ, "backlog", query],
    queryFn: () => listExhaustedOutcomes(query),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Toda recalificación invalida la misma raíz: las tres mueven los mismos números. */
function useOperacion<TInput, TOutput>(
  accion: (input: TInput) => Promise<TOutput>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RAIZ });
    },
  });
}

export function useSweepRatingsMutation() {
  return useOperacion((limit: number) => sweepRatings(limit));
}

export function useRateLoanMutation() {
  return useOperacion((loanId: string) => rateLoan(loanId));
}

export function useRateCustomerMutation() {
  return useOperacion((customerId: string) => rateCustomer(customerId));
}

export function useRatingScale() {
  return useQuery({
    queryKey: queryKeys.carteraEscala,
    queryFn: () => getRatingScale(),
    staleTime: 5 * 60_000,
  });
}
