import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { DefinitionsPackageInput } from "./definitions-package-schema";
import type { DataGovernancePolicyPackageInput } from "./governance-package-schema";
import type { CreateRiskRulesetVersionInput } from "./risk-ruleset-schema";
import type {
  ActivateRulesetInput,
  CatalogDecisionInput,
  CatalogDecisionResult,
  CatalogIngestionInput,
  CatalogIngestionResult,
  CatalogVersionDetail,
  CatalogVersionStatusResult,
  CreateCatalogVersionInput,
  CreateCatalogVersionResult,
  SubmitCatalogVersionInput,
} from "./catalog-version-types";
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
export function getCatalogVersion(catalogCode: string, versionId: string) {
  return apiRequest<CatalogVersionDetail>(
    `/operations/catalogs/${catalogCode}/versions/${versionId}`,
  );
}

// Los POST de este módulo exigen `x-idempotency-key` (mín. 8 caracteres). El
// `x-tenant-id` lo agrega el cliente API solo, así que no se setea acá.
export function createCatalogVersion(
  catalogCode: string,
  body: CreateCatalogVersionInput,
) {
  return apiRequest<CreateCatalogVersionResult>(
    `/operations/catalogs/${catalogCode}/versions`,
    {
      method: "POST",
      body,
      headers: {
        "x-idempotency-key": idempotencyKey("catalog-version-create"),
      },
    },
  );
}

export function submitCatalogVersion(
  catalogCode: string,
  versionId: string,
  body: SubmitCatalogVersionInput,
) {
  return apiRequest<CatalogVersionStatusResult>(
    `/operations/catalogs/${catalogCode}/versions/${versionId}/submit-for-approval`,
    {
      method: "POST",
      body,
      headers: {
        "x-idempotency-key": idempotencyKey("catalog-version-submit"),
      },
    },
  );
}

export function decideCatalogVersion(
  catalogCode: string,
  versionId: string,
  body: CatalogDecisionInput,
) {
  return apiRequest<CatalogDecisionResult>(
    `/operations/catalogs/${catalogCode}/versions/${versionId}/decision`,
    {
      method: "POST",
      body,
      headers: {
        "x-idempotency-key": idempotencyKey("catalog-version-decision"),
      },
    },
  );
}

export function ingestCatalog(body: CatalogIngestionInput) {
  return apiRequest<CatalogIngestionResult>("/operations/catalog-ingestions", {
    method: "POST",
    body,
    headers: { "x-idempotency-key": idempotencyKey("catalog-ingestion") },
  });
}

export function upsertDefinitionsPackage(body: DefinitionsPackageInput) {
  return apiRequest<Record<string, unknown>>(
    "/operations/definitions/package",
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("definitions-package") },
    },
  );
}

export function createRiskRulesetVersion(body: CreateRiskRulesetVersionInput) {
  return apiRequest<Record<string, unknown>>(
    "/operations/risk-policy/ruleset-versions",
    {
      method: "POST",
      body,
      headers: {
        "x-idempotency-key": idempotencyKey("ruleset-version-create"),
      },
    },
  );
}

export function activateRiskRulesetVersion(
  rulesetVersionId: string,
  body: ActivateRulesetInput,
) {
  return apiRequest<Record<string, unknown>>(
    `/operations/risk-policy/ruleset-versions/${rulesetVersionId}/activate`,
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("ruleset-activate") },
    },
  );
}

export function upsertDataGovernancePackage(
  body: DataGovernancePolicyPackageInput,
) {
  return apiRequest<Record<string, unknown>>(
    "/operations/data-governance/policy-package",
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("governance-package") },
    },
  );
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
