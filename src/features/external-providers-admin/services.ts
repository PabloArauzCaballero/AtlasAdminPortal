import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  ApproveProviderRequestInput,
  IdempotencyAudit,
  ProductionGate,
  ProviderRequestsPage,
  ProvidersDashboard,
  QualityAudit,
  ReadinessReport,
  RetentionPreview,
  SanitizationAudit,
  SlaReport,
  UsageReport,
  AuthBrokerAvailability,
  CostPolicy,
  CostPolicyPatchInput,
  PolicyPreviewInput,
  Provider,
  ProviderAuthState,
  ProviderHealth,
  ProviderRuntimePatchInput,
  RetryRequestInput,
  RevokeCredentialResult,
  RotateCredentialInput,
  RotateCredentialResult,
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

// --- Autenticación con proveedores (atlas-auth-broker-worker) --------------

export function getAuthBrokerAvailability() {
  return apiRequest<AuthBrokerAvailability>(`${BASE}/auth-broker/availability`);
}

export function getProviderAuthStates() {
  return apiRequest<{ providers: ProviderAuthState[] }>(`${BASE}/auth-state`);
}

export function getPendingRotation() {
  return apiRequest<{ credentials: ProviderAuthState[] }>(
    `${BASE}/credentials/pending-rotation`,
  );
}

/**
 * El material viaja en el cuerpo hacia el backend, que lo reenvía al broker sin persistirlo. La
 * respuesta trae la huella de la credencial resultante, nunca el material: por eso el formulario
 * puede confirmar "quedó activa ESTA credencial" sin volver a mostrarla.
 */
export function rotateProviderCredential(
  providerCode: string,
  body: RotateCredentialInput,
) {
  return apiRequest<RotateCredentialResult>(
    `${BASE}/${providerCode}/credentials/rotate`,
    { method: "POST", body },
  );
}

export function revokeProviderCredential(providerCode: string, reason: string) {
  return apiRequest<RevokeCredentialResult>(
    `${BASE}/${providerCode}/credentials/revoke`,
    { method: "POST", body: { reason } },
  );
}

export function invalidateProviderToken(providerCode: string) {
  return apiRequest<{ providerCode: string; invalidated: boolean }>(
    `${BASE}/${providerCode}/credentials/invalidate-token`,
    { method: "POST" },
  );
}

// --- Auditoría y diagnóstico ----------------------------------------------
//
// Ya NO son `Record<string, unknown>`. Se tipaban así —y por eso se pintaban como un bloque de
// JSON— con el argumento de que son diagnósticos sin contrato estable. Pero el backend los arma
// con una forma fija en `external-data-governance.service.ts`: lo único que faltaba era escribirla.

export function getQualityAudit() {
  return apiRequest<QualityAudit>(`${BASE}/quality-audit`);
}

export function getProductionGate(query: QueryParams) {
  return apiRequest<ProductionGate>(`${BASE}/production-gate`, { query });
}

export function getReadiness() {
  return apiRequest<ReadinessReport>(`${BASE}/readiness`);
}

export function getSla(query: QueryParams) {
  return apiRequest<SlaReport>(`${BASE}/sla`, { query });
}

export function getUsage(query: QueryParams) {
  return apiRequest<UsageReport>(`${BASE}/usage`, { query });
}

export function getIdempotencyAudit(query: QueryParams) {
  return apiRequest<IdempotencyAudit>(`${BASE}/idempotency-audit`, { query });
}

export function getRetentionPreview(query: QueryParams) {
  return apiRequest<RetentionPreview>(`${BASE}/retention/preview`, { query });
}

export function getSanitizationAudit(query: QueryParams) {
  return apiRequest<SanitizationAudit>(`${BASE}/sanitization-audit`, { query });
}

// --- Tablero de actividad --------------------------------------------------

export function getProvidersDashboard(query: QueryParams) {
  return apiRequest<ProvidersDashboard>(`${BASE}/dashboard`, { query });
}

// --- Solicitudes -----------------------------------------------------------

/** El listado que faltaba. Sin él, las acciones de abajo obligaban a conocer el ID de memoria. */
export function listProviderRequests(query: QueryParams) {
  return apiRequest<ProviderRequestsPage>(`${BASE}/requests`, { query });
}

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
