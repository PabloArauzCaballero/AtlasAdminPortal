import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  CatalogListResponse,
  DataGovernancePolicies,
  DataQualityIssueListResponse,
  DefinitionListResponse,
  ResolveDataQualityIssueInput,
  RiskPolicyCurrent,
} from "./types";

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
export function listOperationCatalogs(query: QueryParams) {
  return apiRequest<CatalogListResponse>("/operations/catalogs", { query });
}
export function listDefinitions(query: QueryParams) {
  return apiRequest<DefinitionListResponse>("/operations/definitions", {
    query,
  });
}
export function getDataGovernancePolicies() {
  return apiRequest<DataGovernancePolicies>(
    "/operations/data-governance/policies",
  );
}
export function getCurrentRiskPolicy() {
  return apiRequest<RiskPolicyCurrent>("/operations/risk-policy/current");
}
export function listDataQualityIssues(query: QueryParams) {
  return apiRequest<DataQualityIssueListResponse>(
    "/operations/data-quality/issues",
    { query },
  );
}
export function resolveDataQualityIssue(
  issueId: string,
  body: ResolveDataQualityIssueInput,
) {
  return apiRequest<{ issueId: string; status: string }>(
    `/operations/data-quality/issues/${issueId}/resolve`,
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("dq-resolve") },
    },
  );
}
