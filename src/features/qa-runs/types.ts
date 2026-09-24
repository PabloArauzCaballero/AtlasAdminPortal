/**
 * Tipos del contrato de la API de control QA (`/api/v1/systems/qa`).
 *
 * Espejo de `docs/qa/contracts.md` del backend (rama `feat/qa-orchestration`). El portal no
 * ejecuta nada de esto: pide un plan, lo lanza y lee el progreso. Las personas, sus sesiones y
 * los pasos corren en el worker del servidor, así que cerrar la pestaña no corta la corrida.
 */

export type QaActor =
  "anonymous" | "customer" | "internal_user" | "merchant_user";

export type QaDatasetMode =
  "NORMAL_SYNTHETIC" | "INVALID" | "BOUNDARY" | "OUTCOMES" | "MIXED";

export type QaEnvironment = {
  environmentId: string;
  label: string;
  deploymentEnvironment: string;
  maxPersons: number;
  maxConcurrency: number;
  limits: {
    maxRequests: number;
    maxDurationMs: number;
    maxInFlightRequests: number;
  };
};

export type QaCapabilities = {
  enabled: boolean;
  deploymentEnvironment: string;
  generatorVersion: string;
  environments: QaEnvironment[];
  worker: {
    ready: boolean;
    lastHeartbeatAt: string | null;
    activeRuns: number;
    queuedRuns: number;
  };
  mock: { reachable: boolean; schemaVersion: string; controlPlane: boolean };
};

export type QaTemplateSummary = {
  code: string;
  version: string;
  name: string;
  description: string;
  workflowCode: string;
  workflowVersion: string;
  actors: QaActor[];
  scenarios: string[];
  defaultScenario: string;
  datasetModes: QaDatasetMode[];
  expectedTerminal: string;
  status: "READY" | "BLOCKED" | "DRAFT";
  blockedReasons: string[];
  stepCount: number;
  providers: string[];
  coveredStepCodes: string[];
};

export type QaTemplateStep = {
  stepKey: string;
  workflowStepCode?: string;
  method: string;
  path: string;
  actor: QaActor;
  dependsOn: string[];
  expectStatus: number[];
  branches: Array<{ label: string; status: number[] }>;
  providers: Array<{ provider: string; expectCall: boolean }>;
  rateLimit?: { bucket: string; perMinute: number };
};

export type QaTemplateDetail = QaTemplateSummary & { steps: QaTemplateStep[] };

export type QaCoverage = {
  rows: Array<{
    stepCode: string;
    status: "COVERED" | "GAP";
    templates: string[];
    gapReason?: string;
  }>;
  summary: {
    total: number;
    covered: number;
    gaps: number;
    byReason: Record<string, number>;
  };
};

export type QaSamplePersona = {
  ordinal: number;
  personaKey: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  city: string;
  monthlyIncome: number;
  archetype: string;
  caseCategory: string;
  email: string;
  phone: string;
};

export type QaSampleInputs = {
  generatorVersion: string;
  personas: QaSamplePersona[];
};

export type QaRunRequest = {
  templateCode: string;
  templateVersion: string;
  environmentId: string;
  mode: "INTEGRATED_QA";
  persons: number;
  concurrency: number;
  seed: string;
  datasetMode: QaDatasetMode;
  scenarioCode: string;
  limits?: { maxRequests?: number };
};

export type QaBlockerCode =
  | "ENDPOINT_UNRESOLVED"
  | "CONTRACT_MISMATCH"
  | "ACTOR_UNAVAILABLE"
  | "FIXTURE_MISSING"
  | "WORKER_UNAVAILABLE"
  | "MOCK_UNAVAILABLE"
  | "SCENARIO_UNSUPPORTED"
  | "UNSAFE_ENVIRONMENT"
  | "BUDGET_EXCEEDED"
  | "BINDING_UNRESOLVED"
  | "GRAPH_INVALID"
  | "TEMPLATE_NOT_READY"
  | "INVALID_INPUT";

export type QaPreflight = {
  status: "READY" | "BLOCKED";
  blockers: Array<{
    code: QaBlockerCode | string;
    message: string;
    subject?: string;
  }>;
  planId: string | null;
  planHash: string | null;
  expiresAt: string | null;
  plan: {
    persons: number;
    concurrency: number;
    limits: Partial<QaEnvironment["limits"]>;
    estimatedRequests: number;
    estimatedAdmissionMs: number;
    stepCount: number;
    providers: string[];
  } | null;
};

export type QaRunStatus =
  | "QUEUED"
  | "PREFLIGHT"
  | "RUNNING"
  | "CANCELLING"
  | "COMPLETED"
  | "CANCELLED"
  | "BLOCKED"
  | "FAILED_INFRASTRUCTURE"
  | "TIMED_OUT";

export type QaVerdict = "PASSED" | "FAILED" | "INCONCLUSIVE" | null;

export type QaRunStepCounts = {
  stepKey: string;
  workflowStepCode: string | null;
  passed: number;
  failed: number;
  skipped: number;
  notApplicable: number;
  indeterminate: number;
  cancelled: number;
};

export type QaRunSummary = {
  runId: string;
  status: QaRunStatus;
  verdict: QaVerdict;
  templateCode: string;
  templateVersion: string;
  workflowCode: string;
  environmentId: string;
  mode: string;
  persons: number;
  concurrency: number;
  seed: string;
  scenarioCode: string;
  datasetMode: string;
  counters: {
    personsRequested: number;
    personsPending: number;
    personsRunning: number;
    personsPassed: number;
    personsFailed: number;
    personsBlocked: number;
    personsIndeterminate: number;
    personsCancelled: number;
    stepsPassed: number;
    stepsFailed: number;
    stepsIndeterminate: number;
    stepsSkipped: number;
    stepsNotApplicable: number;
    requestsIssued: number;
    passRate: number | null;
  };
  steps: QaRunStepCounts[];
  rootCauses: Array<{ stepKey: string; reason: string; personas: number }>;
  evidence: {
    mockNamespace: boolean;
    mockConfirmed: boolean | null;
    providerCalls: number | null;
    detail: string;
  };
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  cancelRequestedAt: string | null;
  operatorId: string;
  errorMessage: string | null;
};

export type QaRunPersona = {
  ordinal: number;
  personaKey: string;
  status: string;
  caseCategory: string;
  archetype: string;
  resources: Record<string, string>;
  failedStepKey: string | null;
  reason: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type QaRunPersonaPage = {
  items: QaRunPersona[];
  total: number;
  page: number;
  limit: number;
};

export type QaPersonaStep = {
  stepKey: string;
  workflowStepCode: string | null;
  status: string;
  branch: string | null;
  reason: string | null;
  rootCauseStepKey: string | null;
  failures: Array<{ code: string; message: string; path?: string }>;
  attempts: Array<{
    attempt: number;
    status: number | string;
    latencyMs: number;
    admissionLagMs: number;
    transportError?: string;
    requestId?: string;
    errorCode?: string;
  }>;
  evidence: {
    method: string;
    path: string;
    requestBody?: unknown;
    responseSummary?: unknown;
    extracted?: Record<string, unknown>;
  };
  startedAt: string | null;
  finishedAt: string | null;
};
