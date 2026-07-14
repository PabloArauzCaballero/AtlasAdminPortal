import type { EndpointItem } from "@/features/systems/types";
import { executeEndpointDirectly } from "./direct-runner";
import type {
  QaJourneyConfig,
  QaJourneyRunResult,
  QaJourneyStepResult,
  QaJourneyStepSpec,
} from "./journey-types";
import type { EndpointRunInput } from "./types";

export async function runJourney(
  steps: QaJourneyStepSpec[],
  config: QaJourneyConfig,
  endpointsById: Map<string, EndpointItem>,
): Promise<QaJourneyRunResult> {
  const startedAt = new Date().toISOString();
  const context: Record<string, unknown> = {};
  const results: QaJourneyStepResult[] = [];

  for (const step of steps) {
    const endpoint = endpointsById.get(step.endpointId);
    if (!endpoint) {
      results.push({
        key: step.key,
        name: step.name ?? step.key,
        endpointId: step.endpointId,
        method: "?",
        url: "",
        passed: false,
        extracted: {},
        skipped: `No se encontró el endpoint #${step.endpointId} en el catálogo.`,
      });
      continue;
    }
    const input = buildStepInput(step, config, context);
    const runResult = await executeEndpointDirectly(endpoint, input);
    const extracted = config.dryRun
      ? {}
      : extractValues(step.extract, runResult.responseBody);
    Object.assign(context, extracted);
    results.push({
      key: step.key,
      name: step.name ?? step.key,
      endpointId: step.endpointId,
      method: runResult.method,
      url: runResult.url,
      httpStatus: runResult.httpStatus,
      ok: runResult.ok,
      passed: config.dryRun ? true : Boolean(runResult.ok),
      latencyMs: runResult.latencyMs,
      error: runResult.error,
      responseBody: runResult.responseBody,
      extracted,
    });
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    totalSteps: steps.length,
    passedSteps: results.filter((step) => step.passed).length,
    failedSteps: results.filter((step) => !step.passed).length,
    context,
    steps: results,
  };
}

function buildStepInput(
  step: QaJourneyStepSpec,
  config: QaJourneyConfig,
  context: Record<string, unknown>,
): EndpointRunInput {
  return {
    environment: config.environment,
    baseRouteKey: config.baseRouteKey,
    customHostUrl: config.customHostUrl,
    dryRun: config.dryRun,
    timeoutMs: config.timeoutMs,
    allowMutations: step.allowMutations ?? true,
    authMode: step.authMode ?? config.authMode,
    customAuthToken: config.customAuthToken,
    includeTenantHeader: config.includeTenantHeader,
    includeIdempotencyKey: config.includeIdempotencyKey,
    deviceProfile: config.deviceProfile,
    payload: substitute(step.payload ?? {}, context) as Record<string, unknown>,
    queryParams: substitute(step.queryParams ?? {}, context) as Record<
      string,
      unknown
    >,
    pathParams: substitute(step.pathParams ?? {}, context) as Record<
      string,
      unknown
    >,
    headers: substitute(step.headers ?? {}, context) as Record<string, string>,
    expectedResponse: {
      statusCodes: step.expectedStatusCodes ?? [200, 201, 202, 204],
      headers: {},
    },
  };
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function substitute(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    return value.replace(PLACEHOLDER_PATTERN, (match, key) => {
      const resolved = getPath(context, key);
      return resolved === undefined ? match : String(resolved);
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => substitute(item, context));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        substitute(item, context),
      ]),
    );
  }
  return value;
}

function extractValues(
  extract: Record<string, string> | undefined,
  responseBody: unknown,
): Record<string, unknown> {
  if (!extract) return {};
  const result: Record<string, unknown> = {};
  for (const [variable, path] of Object.entries(extract)) {
    const value = getPath(responseBody, path);
    if (value !== undefined) result[variable] = value;
  }
  return result;
}

function getPath(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, segment) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[segment]
          : undefined,
      source,
    );
}
