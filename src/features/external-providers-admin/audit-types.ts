import type { CostPolicy } from "./provider-types";

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
  health: {
    status: string;
    latencyMs: number;
    checkedAt: string;
    errorCode?: string | null;
  };
  policies: CostPolicy[];
  recentFailures: number;
  readyForMock: boolean;
  readyForProduction: boolean;
  blockers: string[];
};

export type ReadinessReport = {
  generatedAt: string;
  readiness: ReadinessItem[];
};

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
