import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  DataQualityRule,
  DataQualityRuleListResponse,
  DataQualityRuleRun,
} from "./types";

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

export function runDataQualityRule(ruleId: string) {
  return apiRequest<DataQualityRuleRun>(
    `/internal/data-quality/rules/${ruleId}/run`,
    { method: "POST" },
  );
}
