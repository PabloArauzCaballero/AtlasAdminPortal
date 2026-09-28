"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listPaymentClaims } from "./services";
import type { PaymentClaimsFilters } from "./types";

/** Clave propia del módulo: nada de lo que se hace en el portal cambia esta cola. */
export const paymentClaimsKey = (filters: PaymentClaimsFilters) =>
  ["payment-claims", filters] as const;

export function usePaymentClaims(
  filters: PaymentClaimsFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: paymentClaimsKey(filters),
    queryFn: () => listPaymentClaims(filters),
    placeholderData: keepPreviousData,
    enabled,
  });
}
