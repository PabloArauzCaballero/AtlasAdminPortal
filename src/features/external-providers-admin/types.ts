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
