"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { globalSearch } from "./services";

export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.globalSearch(q),
    queryFn: () => globalSearch(q),
    enabled: q.length > 0,
  });
}
