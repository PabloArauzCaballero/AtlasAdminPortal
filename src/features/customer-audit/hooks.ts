"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getCustomerAuditFeed } from "./services";
import type { CustomerAuditFeedPage } from "./types";

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
