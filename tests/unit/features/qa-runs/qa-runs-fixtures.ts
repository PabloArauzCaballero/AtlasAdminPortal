import type {
  QaCapabilities,
  QaPreflight,
  QaRunSummary,
  QaTemplateSummary,
} from "@/features/qa-runs/types";

/**
 * Respuestas SIMULADAS con la forma de `docs/qa/contracts.md` del backend (`feat/qa-orchestration`).
 * Son pruebas de interfaz y de contrato: no prueban que el servidor responda así, sino que el
 * portal lee bien lo que el contrato dice que responde.
 */
export function capabilitiesFixture(
  overrides: Partial<QaCapabilities> = {},
): QaCapabilities {
  return {
    enabled: true,
    disabledReason: null,
    deploymentEnvironment: "TEST",
    generatorVersion: "persona-factory@1",
    environments: [
      {
        environmentId: "qa-isolated",
        label: "QA aislado",
        deploymentEnvironment: "TEST",
        maxPersons: 100,
        maxConcurrency: 10,
        limits: {
          maxRequests: 3000,
          maxDurationMs: 1_800_000,
          maxInFlightRequests: 10,
        },
      },
    ],
    worker: {
      ready: true,
      lastHeartbeatAt: "2026-09-24T12:00:00.000Z",
      activeRuns: 0,
      queuedRuns: 0,
    },
    mock: { reachable: true, schemaVersion: "2.0.0", controlPlane: true },
    ...overrides,
  };
}

export function templateFixture(
  overrides: Partial<QaTemplateSummary> = {},
): QaTemplateSummary {
  return {
    code: "account_signup_to_login",
    version: "1.0.0",
    name: "Alta de cuenta hasta el login",
    description: "Una persona se registra, verifica su código y entra.",
    workflowCode: "customer_full_lifecycle",
    workflowVersion: "v1",
    actors: ["anonymous", "customer"],
    scenarios: ["happy_path", "otp_delay"],
    defaultScenario: "happy_path",
    datasetModes: ["NORMAL_SYNTHETIC", "INVALID", "BOUNDARY", "MIXED"],
    expectedTerminal: "LOGGED_IN",
    status: "READY",
    blockedReasons: [],
    stepCount: 4,
    providers: [],
    coveredStepCodes: ["signup", "login"],
    ...overrides,
  };
}

export function readyPreflight(
  overrides: Partial<QaPreflight> = {},
): QaPreflight {
  return {
    status: "READY",
    blockers: [],
    planId: "12",
    planHash: "hash-12",
    expiresAt: "2026-09-24T12:15:00.000Z",
    plan: {
      persons: 20,
      concurrency: 5,
      limits: { maxRequests: 3000, maxDurationMs: 1_800_000 },
      estimatedRequests: 80,
      estimatedAdmissionMs: 60_000,
      stepCount: 4,
      providers: [],
    },
    ...overrides,
  };
}

export function blockedPreflight(): QaPreflight {
  return {
    status: "BLOCKED",
    blockers: [
      {
        code: "WORKER_UNAVAILABLE",
        message: "El worker de QA no envió latido en los últimos 60 s.",
      },
      {
        code: "ACTOR_UNAVAILABLE",
        message: "No hay usuario interno de QA para el paso de revisión.",
        subject: "review_decision",
      },
    ],
    planId: null,
    planHash: null,
    expiresAt: null,
    plan: null,
  };
}

export function runFixture(
  overrides: Partial<QaRunSummary> = {},
): QaRunSummary {
  return {
    runId: "run-1",
    status: "RUNNING",
    verdict: null,
    templateCode: "account_signup_to_login",
    templateVersion: "1.0.0",
    workflowCode: "customer_full_lifecycle",
    environmentId: "qa-isolated",
    mode: "INTEGRATED_QA",
    persons: 20,
    concurrency: 5,
    seed: "atlas-qa-regression-v1",
    scenarioCode: "happy_path",
    datasetMode: "NORMAL_SYNTHETIC",
    counters: {
      personsRequested: 20,
      personsPending: 10,
      personsRunning: 5,
      personsPassed: 4,
      personsFailed: 1,
      personsBlocked: 0,
      personsIndeterminate: 0,
      personsCancelled: 0,
      stepsPassed: 16,
      stepsFailed: 1,
      stepsIndeterminate: 0,
      stepsSkipped: 3,
      stepsNotApplicable: 0,
      requestsIssued: 20,
      passRate: 16 / 17,
    },
    steps: [],
    rootCauses: [],
    evidence: {
      mockNamespace: true,
      mockConfirmed: null,
      providerCalls: null,
      detail: "",
    },
    createdAt: "2026-09-24T12:00:00.000Z",
    startedAt: "2026-09-24T12:00:01.000Z",
    finishedAt: null,
    cancelRequestedAt: null,
    operatorId: "7",
    errorMessage: null,
    ...overrides,
  };
}
