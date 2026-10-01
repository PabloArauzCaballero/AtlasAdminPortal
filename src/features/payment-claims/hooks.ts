"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePageSize } from "@/shared/lib/page-size";
import { listPaymentClaims, PAYMENT_CLAIMS_PAGE_SIZE } from "./services";
import type { PaymentClaimsFilters } from "./types";

/** Clave propia del módulo: nada de lo que se hace en el portal cambia esta cola. */
export const paymentClaimsKey = (filters: PaymentClaimsFilters) =>
  ["payment-claims", filters] as const;

export function usePaymentClaims(
  filters: PaymentClaimsFilters,
  enabled = true,
) {
  const pageSize = usePageSize(PAYMENT_CLAIMS_PAGE_SIZE);
  return useQuery({
    queryKey: [...paymentClaimsKey(filters), pageSize],
    queryFn: () => listPaymentClaims(filters, pageSize),
    placeholderData: keepPreviousData,
    enabled,
  });
}
