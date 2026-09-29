"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { globalSearch } from "./services";
import type { GlobalSearchKind } from "./types";

export function useGlobalSearch(
  q: string,
  kind: GlobalSearchKind | null,
  page: number,
  limit?: number,
) {
  return useQuery({
    queryKey: queryKeys.globalSearch(q, kind ?? "all", page, limit ?? 0),
    queryFn: () => globalSearch(q, kind, page, limit),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  });
}
