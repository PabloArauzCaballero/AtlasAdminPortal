import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";
import type { EndpointItem } from "./catalog-types";

export type TestSuite = {
  suiteId: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  suiteType: string;
  executionMode: string | null;
  environmentScope: string[];
  isEnabled: boolean;
  requiresSeedData: boolean;
  isSafeForProduction: boolean;
  requiresDestructivePermission: boolean;
};

export type TestStep = {
  stepId: string;
  suiteId: string;
  endpointId: string | null;
  stepOrder: number;
  name: string;
  inputMode: string;
  method: string;
  pathTemplate: string;
  defaultHeaders: JsonRecord;
  defaultPayload: JsonRecord;
  configSchema: JsonRecord;
  extractors: JsonRecord;
  assertions: JsonRecord;
  continueOnFailure: boolean;
  cleanupRequired: boolean;
};

export type TestSuiteDetail = {
  suite: TestSuite;
  steps: TestStep[];
};

export type TestSuiteType =
  "INTEGRATION" | "SMOKE" | "REGRESSION" | "E2E_API" | "LOAD";

export type TestStepInputMode =
  "DEFAULT" | "CONFIGURABLE" | "GENERATED" | "FROM_PREVIOUS_STEP";

export type HttpMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

/**
 * Cuerpo de `POST /systems/test-suites` y `PATCH /systems/test-suites/:suiteId`.
 *
 * En el PATCH el backend usa un schema donde **todo es opcional y sin
 * defaults** (a propósito: `.partial()` habría reaplicado los `.default()` de
 * Zod y sobrescrito suites existentes en silencio). Por eso el update manda
 * solo lo que cambió y rechaza un body vacío.
 */
export type UpsertTestSuiteInput = {
  code?: string;
  name?: string;
  description?: string;
  module?: string;
  suiteType?: TestSuiteType;
  environmentScope?: StressEnvironment[];
  isEnabled?: boolean;
  requiresSeedData?: boolean;
  isSafeForProduction?: boolean;
  requiresDestructivePermission?: boolean;
};

export type CreateTestStepInput = {
  endpointId?: string | null;
  stepOrder: number;
  name: string;
  inputMode?: TestStepInputMode;
  method: HttpMethod;
  /** Debe empezar con una sola `/`. El backend rechaza `//…`. */
  pathTemplate: string;
  defaultHeaders?: JsonRecord;
  defaultPayload?: JsonRecord;
  configSchema?: JsonRecord;
  extractors?: JsonRecord;
  assertions?: JsonRecord;
  continueOnFailure?: boolean;
  cleanupRequired?: boolean;
};

export type ReorderTestStepsInput = {
  steps: Array<{ stepId: string; stepOrder: number }>;
};

export type TestRun = {
  runId: string;
  suiteId: string;
  environment: string;
  triggeredBy: string | null;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  summary: JsonRecord | null;
  logsUrl: string | null;
  createdAt: string | null;
};

export type TestStepRun = {
  stepRunId: string;
  testRunId: string;
  stepId: string;
  status: string;
  requestPayloadSanitized: JsonRecord | null;
  responseBodySanitized: unknown;
  statusCode: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string | null;
};

export type TestRunDetail = {
  run: TestRun;
  steps: TestStepRun[];
};

export type StressProfile = {
  profileId: string;
  endpointId: string;
  code: string;
  name: string;
  targetRps: number;
  durationSeconds: number;
  concurrency: number;
  environmentScope: string[];
  maxErrorRate: string | number | null;
  maxP95Ms: number | null;
  isEnabled: boolean;
  requiresApproval: boolean;
  status: string;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StressMatrixItem = {
  endpoint: EndpointItem;
  profiles: StressProfile[];
  hasEnabledProfile: boolean;
};

export type StressRun = {
  jobRunId: string;
  jobCode: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  inputJson: JsonRecord | null;
  resultJson: JsonRecord | null;
  errorMessage: string | null;
  triggeredByType: string | null;
  triggeredById: string | null;
  createdAt: string | null;
};

/**
 * Cuerpo de `POST /systems/stress-profiles`.
 *
 * Es un **upsert**, no un create: el backend deriva el `code` final desde el
 * código del endpoint (`stressCode(endpoint.code, body.code)`) y hace `upsert`
 * sobre esa clave. No existe un PATCH aparte — reenviar el mismo `code`
 * sobrescribe el perfil existente.
 */
export type UpsertStressProfileInput = {
  endpointId: string;
  code?: string;
  name: string;
  targetRps: number;
  durationSeconds: number;
  concurrency: number;
  environmentScope?: StressEnvironment[];
  /** Fracción (0–1), no porcentaje. El backend rechaza > 1. */
  maxErrorRate?: number;
  maxP95Ms?: number;
  isEnabled?: boolean;
  requiresApproval?: boolean;
  status?: StressProfileStatus;
  notes?: string;
};

export type StressEnvironment = "LOCAL" | "STAGING" | "PRODUCTION_READONLY";

export type StressProfileStatus =
  "ACTIVE" | "DISABLED" | "NEEDS_REVIEW" | "DEPRECATED";

export type QueueStressRunInput = {
  environment: "LOCAL" | "STAGING" | "PRODUCTION_READONLY";
  dryRun: boolean;
  baseUrl?: string;
  approvalTicket?: string;
  config: Record<string, unknown>;
  headers: Record<string, string>;
};

export type TestSuiteListResponse = PaginatedResponse<TestSuite>;
export type TestRunListResponse = PaginatedResponse<TestRun>;
export type StressProfileListResponse = PaginatedResponse<StressProfile>;
export type StressMatrixResponse = PaginatedResponse<StressMatrixItem>;
export type StressRunListResponse = PaginatedResponse<StressRun>;
