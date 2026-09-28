"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOutcomeDeliveryStatus,
  getPortfolioSummary,
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
export function useExhaustedOutcomes(limit: number, enabled = true) {
  return useQuery({
    queryKey: [...RAIZ, "backlog", limit],
    queryFn: () => listExhaustedOutcomes(limit),
    enabled,
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
