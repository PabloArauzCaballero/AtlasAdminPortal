import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { DataQualityRule, DataQualityRuleListResponse } from "./types";

/**
 * Sólo lectura. `POST /internal/data-quality/rules/:id/run` lo retiró AtlasBackend (devolvía 200
 * sin ejecutar nada); lo que existe es el job de mantenimiento
 * `POST /operations/jobs/recalculate-data-quality`, que recalcula TODAS las reglas (con `dryRun`),
 * no una regla suelta.
 */
export function listDataQualityRules(query: QueryParams) {
  return apiRequest<DataQualityRuleListResponse>(
    "/internal/data-quality/rules",
    {
      query,
    },
  );
}

export function getDataQualityRule(ruleId: string) {
  return apiRequest<DataQualityRule>(`/internal/data-quality/rules/${ruleId}`);
}
