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

export function useExhaustedOutcomes(limit: number) {
  return useQuery({
    queryKey: [...RAIZ, "backlog", limit],
    queryFn: () => listExhaustedOutcomes(limit),
  });
}

/** Toda recalificación invalida la misma raíz: las tres mueven los mismos números. */
function useOperacion<TInput>(accion: (input: TInput) => Promise<unknown>) {
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
