import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  ApproveProviderRequestInput,
  CostPolicy,
  CostPolicyPatchInput,
  PolicyPreviewInput,
  Provider,
  ProviderHealth,
  ProviderRuntimePatchInput,
  RetryRequestInput,
  TestProviderInput,
} from "./types";

const BASE = "/admin/external-providers";

// --- Catálogo, salud y acciones por proveedor ------------------------------

export function listProviders() {
  return apiRequest<Provider[]>(BASE);
}

export function getProviderHealth() {
  return apiRequest<ProviderHealth[]>(`${BASE}/health`);
}

export function patchProviderRuntime(
  providerCode: string,
  body: ProviderRuntimePatchInput,
) {
  return apiRequest<Record<string, unknown>>(
    `${BASE}/${providerCode}/runtime`,
    {
      method: "PATCH",
      body,
    },
  );
}

export function activateKillSwitch(providerCode: string, reason?: string) {
  return apiRequest<Record<string, unknown>>(
    `${BASE}/${providerCode}/kill-switch`,
    { method: "POST", body: { reason } },
  );
}

export function getProviderCostPolicies(providerCode: string) {
  return apiRequest<CostPolicy[]>(`${BASE}/${providerCode}/cost-policy`);
}

export function updateProviderCostPolicy(
  providerCode: string,
  queryType: string,
  body: CostPolicyPatchInput,
) {
  return apiRequest<CostPolicy>(
    `${BASE}/${providerCode}/cost-policy/${queryType}`,
    { method: "PATCH", body },
  );
}

export function testProvider(providerCode: string, body: TestProviderInput) {
  return apiRequest<Record<string, unknown>>(`${BASE}/${providerCode}/test`, {
    method: "POST",
    body,
  });
}

// --- Auditoría y diagnóstico (payloads heterogéneos, sin DTO estable) ------

export function getQualityAudit() {
  return apiRequest<Record<string, unknown>>(`${BASE}/quality-audit`);
}

export function getProductionGate(query: QueryParams) {
  return apiRequest<Record<string, unknown>>(`${BASE}/production-gate`, {
    query,
  });
}

export function getReadiness() {
  return apiRequest<Record<string, unknown>>(`${BASE}/readiness`);
}

export function getSla(query: QueryParams) {
  return apiRequest<Record<string, unknown>>(`${BASE}/sla`, { query });
}

export function getUsage(query: QueryParams) {
  return apiRequest<Record<string, unknown>>(`${BASE}/usage`, { query });
}

export function getIdempotencyAudit(query: QueryParams) {
  return apiRequest<Record<string, unknown>>(`${BASE}/idempotency-audit`, {
    query,
  });
}

export function getRetentionPreview(query: QueryParams) {
  return apiRequest<Record<string, unknown>>(`${BASE}/retention/preview`, {
    query,
  });
}

export function getSanitizationAudit(query: QueryParams) {
  return apiRequest<Record<string, unknown>>(`${BASE}/sanitization-audit`, {
    query,
  });
}

// --- Solicitudes (por ID, sin listado disponible en el backend) -----------

export function approveRequest(
  requestId: string,
  body: ApproveProviderRequestInput,
) {
  return apiRequest<Record<string, unknown>>(
    `${BASE}/requests/${requestId}/approve`,
    { method: "POST", body },
  );
}

export function retryRequest(requestId: string, body: RetryRequestInput) {
  return apiRequest<Record<string, unknown>>(
    `${BASE}/requests/${requestId}/retry`,
    { method: "POST", body },
  );
}

export function rebuildFeatures(requestId: string) {
  return apiRequest<Record<string, unknown>>(
    `${BASE}/requests/${requestId}/rebuild-features`,
    { method: "POST" },
  );
}

export function previewPolicy(body: PolicyPreviewInput) {
  return apiRequest<Record<string, unknown>>(`${BASE}/policy/preview`, {
    method: "POST",
    body,
  });
}
