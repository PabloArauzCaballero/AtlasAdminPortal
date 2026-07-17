"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getCustomerAuditFeed, listCustomerAuditEvents } from "./services";
import type { CustomerAuditEventsQuery, CustomerAuditFeedPage } from "./types";

export const CUSTOMER_AUDIT_PAGE_SIZE = 50;

/**
 * Feed por cursor. `initialPageParam`/`getNextPageParam` son obligatorios en
 * TanStack Query v5. El cursor es opaco (base64url de la tupla del backend):
 * se pasa tal cual y `null` corta la paginación.
 */
export function useCustomerAuditFeed(customerId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.customerAuditFeed(customerId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getCustomerAuditFeed(customerId, {
        limit: CUSTOMER_AUDIT_PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: CustomerAuditFeedPage) =>
      lastPage.nextCursor ?? undefined,
    enabled: Boolean(customerId),
  });
}

export function useCustomerAuditEvents(
  customerId: string,
  query: CustomerAuditEventsQuery,
) {
  return useQuery({
    queryKey: queryKeys.customerAuditEvents(customerId, query),
    queryFn: () => listCustomerAuditEvents(customerId, query),
    enabled: Boolean(customerId),
  });
}
