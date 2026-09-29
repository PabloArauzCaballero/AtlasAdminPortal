"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { getDataQualityRule, listDataQualityRules } from "./services";

export function useDataQualityRules(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.dataQualityRules(query),
    queryFn: () => listDataQualityRules(query),
    // Cambiar de página o de filtro no vacía la tabla mientras llega la siguiente.
    placeholderData: keepPreviousData,
  });
}

export function useDataQualityRule(ruleId: string) {
  return useQuery({
    queryKey: queryKeys.dataQualityRule(ruleId),
    queryFn: () => getDataQualityRule(ruleId),
    enabled: Boolean(ruleId),
  });
}
