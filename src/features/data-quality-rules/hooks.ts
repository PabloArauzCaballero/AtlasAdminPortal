"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getDataQualityRule,
  listDataQualityRules,
  runDataQualityRule,
} from "./services";

export function useDataQualityRules(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.dataQualityRules(query),
    queryFn: () => listDataQualityRules(query),
  });
}

export function useDataQualityRule(ruleId: string) {
  return useQuery({
    queryKey: queryKeys.dataQualityRule(ruleId),
    queryFn: () => getDataQualityRule(ruleId),
    enabled: Boolean(ruleId),
  });
}

export function useRunDataQualityRuleMutation(ruleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runDataQualityRule(ruleId),
    onSuccess: async () => {
      await Promise.all([
        // Reglas y su detalle viven bajo `internal`…
        queryClient.invalidateQueries({
          queryKey: ["internal", "data-quality"],
        }),
        // …pero ejecutar una regla abre/cierra issues, y esos cuelgan de otra
        // raíz (`operations`). Sin esto la lista de issues queda stale.
        queryClient.invalidateQueries({
          queryKey: ["operations", "data-quality", "issues"],
        }),
      ]);
    },
  });
}
