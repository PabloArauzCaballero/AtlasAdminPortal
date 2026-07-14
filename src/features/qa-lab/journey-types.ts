import type { QaAuthMode } from "./types";

export type QaJourneyStepSpec = {
  key: string;
  name?: string;
  endpointId: string;
  pathParams?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
  expectedStatusCodes?: number[];
  extract?: Record<string, string>;
  authMode?: QaAuthMode;
  allowMutations?: boolean;
};

export type QaJourneyConfig = {
  environment: string;
  baseRouteKey: string;
  customHostUrl?: string;
  dryRun: boolean;
  timeoutMs: number;
  authMode: QaAuthMode;
  customAuthToken?: string;
  deviceProfile?: string;
  includeTenantHeader: boolean;
  includeIdempotencyKey: boolean;
};

export type QaJourneyStepResult = {
  key: string;
  name: string;
  endpointId: string;
  method: string;
  url: string;
  httpStatus?: number;
  ok?: boolean;
  passed: boolean;
  latencyMs?: number;
  error?: string;
  responseBody?: unknown;
  extracted: Record<string, unknown>;
  skipped?: string;
};

export type QaJourneyRunResult = {
  startedAt: string;
  finishedAt: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  context: Record<string, unknown>;
  steps: QaJourneyStepResult[];
};

export const JOURNEY_EXAMPLE_SPEC: QaJourneyStepSpec[] = [
  {
    key: "health",
    name: "Health check",
    endpointId: "REEMPLAZA_CON_ID_DE_/health",
    expectedStatusCodes: [200],
  },
  {
    key: "onboarding_start",
    name: "Iniciar onboarding",
    endpointId: "REEMPLAZA_CON_ID_DE_/customer-onboarding/start",
    payload: { channel: "mobile_app" },
    expectedStatusCodes: [200, 201],
    extract: { customerId: "data.customerId" },
  },
  {
    key: "investigation_summary",
    name: "Resumen de investigación",
    endpointId:
      "REEMPLAZA_CON_ID_DE_/operations/customers/:customerId/investigation-summary",
    pathParams: { customerId: "{{customerId}}" },
    expectedStatusCodes: [200],
  },
];
