export type Provider = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  status: string;
  defaultMode: string;
  requiresConsent: boolean;
  requiresManualApproval: boolean;
  isCostly: boolean;
  description: string | null;
};

export type ProviderHealth = {
  providerCode: string;
  status: string;
  mode: string;
  latencyMs: number;
  checkedAt: string;
  errorCode?: string | null;
};

/**
 * Estado de autenticación de un proveedor, servido por el `atlas-auth-broker-worker` a través del
 * backend. Todo campo aquí es publicable por construcción: huellas, fechas y códigos. El material
 * de la credencial no atraviesa esta frontera — la única ruta del broker que devuelve un token la
 * consumen los adaptadores del backend, nunca el portal.
 */
export type ProviderAuthMethod =
  | "oauth2_client_credentials"
  | "jwt_bearer"
  | "mtls"
  | "api_key"
  | "none";

export type CredentialStatus =
  | "ACTIVE"
  | "MISSING"
  | "EXPIRED"
  | "ROTATION_DUE"
  | "REVOKED"
  | "NOT_REQUIRED";

export type AccessTokenStatus =
  | "VALID"
  | "EXPIRING"
  | "EXPIRED"
  | "NONE"
  | "REFRESH_FAILED";

export type ProviderAuthState = {
  providerCode: string;
  authMethod: ProviderAuthMethod;
  credentialStatus: CredentialStatus;
  tokenStatus: AccessTokenStatus;
  credentialFingerprint?: string;
  scopes: string[];
  issuedAt?: string;
  rotatedAt?: string;
  rotationDueAt?: string;
  credentialAgeDays?: number;
  tokenExpiresAt?: string;
  lastRefreshAt?: string;
  lastFailureCode?: string;
  lastFailureAt?: string;
};

/**
 * `configured: false` NO es un error: significa que este despliegue todavía no delega la
 * autenticación en el broker. La UI debe decirlo así en vez de pintar un fallo rojo.
 */
export type AuthBrokerAvailability = {
  configured: boolean;
  reachable: boolean;
  vaultDriver?: string;
  errorCode?: string;
};

export type CredentialField =
  | "CLIENT_ID"
  | "CLIENT_SECRET"
  | "API_KEY"
  | "PRIVATE_KEY";

export type RotateCredentialInput = {
  field: CredentialField;
  material: string;
  reason: string;
};

export type RotateCredentialResult = {
  providerCode: string;
  field: string;
  fingerprint: string;
  rotatedAt: string;
};

export type RevokeCredentialResult = {
  revokedAt: string;
};

export type CostPolicy = {
  id: string;
  providerId: string;
  queryType: string;
  unitCostAmount: number | null;
  currency: string | null;
  costTier: "FREE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  maxQueriesPerUserPerDay: number | null;
  maxQueriesPerUserPerMonth: number | null;
  maxQueriesGlobalPerDay: number | null;
  allowedDecisionStagesJson: string[];
  requiresManualApproval: boolean;
  requiresAdminRole: boolean;
  blockByDefault: boolean;
  cacheTtlSeconds: number | null;
  featureTtlSeconds: number | null;
  retryMaxAttempts: number | null;
  retryBackoffSeconds: number | null;
  active: boolean;
};

export type ProviderRuntimePatchInput = {
  defaultMode?:
    "mock_local" | "mock_server" | "sandbox" | "production" | "disabled";
  providerStatus?: "ACTIVE" | "DISABLED" | "MOCK_ONLY" | "SANDBOX_ONLY";
  isActive?: boolean;
  confirmProductionReady?: boolean;
  reason?: string;
};

export type CostPolicyPatchInput = Partial<{
  unitCostAmount: number;
  currency: string;
  costTier: "FREE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  maxQueriesPerUserPerDay: number | null;
  maxQueriesPerUserPerMonth: number | null;
  maxQueriesGlobalPerDay: number | null;
  requiresManualApproval: boolean;
  requiresAdminRole: boolean;
  blockByDefault: boolean;
  cacheTtlSeconds: number | null;
  featureTtlSeconds: number | null;
  retryMaxAttempts: number | null;
  retryBackoffSeconds: number | null;
  active: boolean;
}>;

export type ApproveProviderRequestInput = {
  approvedByAdminId?: string;
  approvalReason?: string;
};

export type RetryRequestInput = {
  providerCode?: string;
  queryType?: string;
  purpose?: string;
  decisionStage?: string;
  customerId?: string;
  scenario?: string;
  approvedByAdminId?: string;
  input?: Record<string, unknown>;
};

export type TestProviderInput = {
  customerId?: string;
  queryType?: string;
  purpose?: string;
  decisionStage?: string;
  scenario?: string;
  input?: Record<string, unknown>;
};

export type PolicyPreviewInput = {
  customerId?: string;
  providerCode: string;
  queryType: string;
  purpose: string;
  decisionStage: string;
  scenario?: string;
  input?: Record<string, unknown>;
};
