"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { getBusinessTerm, listBusinessTerms } from "./services";

export function useBusinessTerms(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.businessTerms(query),
    queryFn: () => listBusinessTerms(query),
  });
}

export function useBusinessTerm(termId: string) {
  return useQuery({
    queryKey: queryKeys.businessTerm(termId),
    queryFn: () => getBusinessTerm(termId),
    enabled: Boolean(termId),
  });
}
