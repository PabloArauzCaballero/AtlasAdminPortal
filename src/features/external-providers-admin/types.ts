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
  "oauth2_client_credentials" | "jwt_bearer" | "mtls" | "api_key" | "none";

export type CredentialStatus =
  | "ACTIVE"
  | "MISSING"
  | "EXPIRED"
  | "ROTATION_DUE"
  | "REVOKED"
  | "NOT_REQUIRED";

export type AccessTokenStatus =
  "VALID" | "EXPIRING" | "EXPIRED" | "NONE" | "REFRESH_FAILED";

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
  "CLIENT_ID" | "CLIENT_SECRET" | "API_KEY" | "PRIVATE_KEY";

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

// --- Tablero de actividad y listado de solicitudes --------------------------

/**
 * Los reportes de esta pantalla se tipaban como `Record<string, unknown>` y se pintaban como un
 * bloque de JSON, con el argumento de que son «diagnósticos sin DTO estable». En la práctica el
 * backend los construye con una forma FIJA en `external-data-governance.service.ts`, así que lo
 * único que faltaba era escribirla. Con la forma escrita se pueden pintar como tablas.
 */

export type HealthPoint = {
  status: string;
  latencyMs: number;
  checkedAt: string;
};

export type ProviderActivity = {
  total: number;
  success: number;
  failed: number;
  blocked: number;
  cached: number;
  /** `null` = no hubo llamadas. NO es 0 %: «nadie le llamó» y «todo falló» no se pintan igual. */
  successRate: number | null;
  p95LatencyMs: number | null;
  avgLatencyMs: number | null;
  estimatedCost: number;
  actualCost: number;
  lastRequestAt: string | null;
  lastErrorStatus: string | null;
  lastErrorMessage: string | null;
};

export type DashboardProvider = {
  providerCode: string;
  name: string | null;
  category: string | null;
  status: string;
  mode: string;
  isCostly: boolean;
  requiresManualApproval: boolean;
  health:
    | (HealthPoint & {
        modeChecked: string;
        errorCode: string | null;
        errorMessageSafe: string | null;
      })
    | null;
  healthSeries: HealthPoint[];
  activity: ProviderActivity;
};

export type ProviderRequestRow = {
  requestId: string;
  providerCode: string | null;
  customerId: string | null;
  requestType: string | null;
  purposeCode: string | null;
  decisionStage: string | null;
  modeUsed: string | null;
  responseStatus: string | null;
  responseCode: string | null;
  approvalStatus: string | null;
  latencyMs: number | null;
  estimatedCostAmount: number | null;
  actualCostAmount: number | null;
  currency: string | null;
  errorMessageSafe: string | null;
  requestedAt: string | null;
  respondedAt: string | null;
};

export type ProvidersDashboard = {
  generatedAt: string;
  days: number;
  windowFrom: string;
  totals: {
    providers: number;
    respondingProviders: number;
    unmeasuredProviders: number;
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    blockedCalls: number;
    successRate: number | null;
    worstP95LatencyMs: number | null;
    estimatedCost: number;
    actualCost: number;
  };
  providers: DashboardProvider[];
  recentRequests: ProviderRequestRow[];
};

export type ProviderRequestsPage = {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  requests: ProviderRequestRow[];
};

// --- Auditorías, ya con su forma real ---------------------------------------

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type QualityFinding = {
  severity: Severity;
  providerCode?: string;
  code: string;
  message: string;
};

export type QualityAudit = {
  generatedAt: string;
  score: number;
  rating: string;
  findings: QualityFinding[];
  qualityGates: {
    canEnableProductionProviders: boolean;
    canRunCostlyProvidersAutomatically: boolean;
    scoringProviderCouplingAllowed: boolean;
  };
};

export type ReadinessItem = {
  providerCode: string;
  name: string | null;
  category: string | null;
  status: string;
  mode: string;
  health: { status: string; latencyMs: number; checkedAt: string; errorCode?: string | null };
  policies: CostPolicy[];
  recentFailures: number;
  readyForMock: boolean;
  readyForProduction: boolean;
  blockers: string[];
};

export type ReadinessReport = { generatedAt: string; readiness: ReadinessItem[] };

export type ProductionGate = {
  generatedAt: string;
  providerCode: string;
  strict: boolean;
  status: "PASS" | "FAIL";
  canPromoteProduction: boolean;
  blockers: string[];
  qualityScore: number;
  sanitizationScore: number;
  providers: Array<{
    providerCode: string;
    mode: string;
    healthStatus: string;
    readyForMock: boolean;
    readyForProduction: boolean;
    blockers: string[];
  }>;
  requiredManualChecks: string[];
};

export type SlaReport = {
  generatedAt: string;
  providerCode: string;
  days: number;
  providers: Array<{
    providerCode: string;
    total: number;
    success: number;
    failed: number;
    blocked: number;
    cached: number;
    rateLimited: number;
    authFailed: number;
    successRate: number | null;
    failureRate: number | null;
    p95LatencyMs: number | null;
    actualCost: number;
    warnings: string[];
  }>;
};

export type UsageReport = {
  generatedAt: string;
  days: number;
  providerCode: string;
  summary: {
    total: number;
    executed: number;
    blocked: number;
    cached: number;
    estimatedCost: number;
    actualCost: number;
  };
};

export type IdempotencyAudit = {
  generatedAt: string;
  days: number;
  inspectedRequests: number;
  findings: Array<{
    severity: string;
    code: string;
    keyHash: string;
    occurrences: number;
    requestIds: string[];
  }>;
  score: number;
  qualityGate: "PASS" | "FAIL";
  controls: string[];
};

export type RetentionPreview = {
  generatedAt: string;
  olderThanDays?: number;
  candidateCount?: number;
  candidates?: Array<{
    requestId: string;
    providerId?: string;
    customerId?: string;
    requestedAt?: string;
    responseStatus?: string;
    action?: string;
  }>;
  note?: string;
};

export type SanitizationAudit = {
  generatedAt: string;
  inspectedResponses: number;
  score: number;
  qualityGate: "PASS" | "FAIL";
  findings: Array<{
    severity: string;
    responseId: string;
    providerRequestId: string;
    code: string;
    key: string;
  }>;
};
