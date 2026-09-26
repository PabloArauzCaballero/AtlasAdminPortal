import type { EndpointItem } from "@/features/systems/types";
import { executeEndpointDirectly } from "./direct-runner";
import { fetchFakerCases } from "./fakers/faker-client";
import type { FakerContext } from "./fakers/faker-types";
import { qaLocalValues } from "./qa-sample-entries";
import type {
  QaJourneyBatchResult,
  QaJourneyConfig,
  QaJourneyIterationResult,
  QaJourneyRunResult,
  QaJourneyStepResult,
  QaJourneyStepSpec,
} from "./journey-types";
import type { EndpointRunInput } from "./types";

/**
 * De dónde salen las N personas del lote. Por defecto, del generador de datos del mock (`caso`,
 * con la semilla de la corrida): misma semilla ⇒ mismas N personas. Inyectable para las pruebas.
 */
export type PersonaSource = (
  seed: string,
  count: number,
) => Promise<FakerContext[]>;

const fakerPersonas: PersonaSource = (seed, count) =>
  fetchFakerCases({ seed, count, variant: "valido" });

/**
 * Corre el journey `iterations` veces — cada una con su propia persona determinista (misma
 * semilla ⇒ mismas N personas) y su propio `x-mock-persona-key`, para que el mock de proveedores
 * externos aísle el estado de cada una. Es lo que convierte "un journey" en "simular un lote de
 * clientes atravesando el mismo flujo con las cantidades pedidas", en vez de una corrida suelta.
 */
export async function runJourneyBatch(
  steps: QaJourneyStepSpec[],
  config: QaJourneyConfig,
  endpointsById: Map<string, EndpointItem>,
  personaSource: PersonaSource = fakerPersonas,
): Promise<QaJourneyBatchResult> {
  const startedAt = new Date().toISOString();
  const iterations = clamp(config.iterations, 1, 200);
  const concurrency = clamp(config.concurrency, 1, 20);
  const seed = config.seed || "qa-base";
  // Sin generador no hay personas: se corta con el motivo en vez de inventarlas.
  const cases = await personaSource(seed, iterations);
  const runs: QaJourneyIterationResult[] = new Array(iterations);

  await runWithConcurrency(iterations, concurrency, async (index) => {
    const faker = cases[index] ?? {};
    const persona = (faker.caso?.persona ?? {}) as Record<string, unknown>;
    const result = await runJourney(steps, config, endpointsById, {
      persona,
      faker,
      qa: qaLocalValues(seed, index),
      personaKey: `journey-${index}`,
    });
    runs[index] = { index, persona, result };
  });

  return {
    iterations,
    concurrency,
    seed,
    startedAt,
    finishedAt: new Date().toISOString(),
    passedIterations: runs.filter((run) => run.result.failedSteps === 0).length,
    failedIterations: runs.filter((run) => run.result.failedSteps > 0).length,
    runs,
  };
}

async function runWithConcurrency(
  total: number,
  concurrency: number,
  task: (index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker(): Promise<void> {
    while (next < total) {
      const index = next;
      next += 1;
      await task(index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker()),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

export async function runJourney(
  steps: QaJourneyStepSpec[],
  config: QaJourneyConfig,
  endpointsById: Map<string, EndpointItem>,
  runContext: {
    persona?: Record<string, unknown>;
    faker?: FakerContext;
    qa?: Record<string, unknown>;
    personaKey?: string;
  } = {},
): Promise<QaJourneyRunResult> {
  const startedAt = new Date().toISOString();
  const context: Record<string, unknown> = {
    ...(runContext.persona ? { persona: runContext.persona } : {}),
    ...(runContext.faker ? { faker: runContext.faker } : {}),
    ...(runContext.qa ? { qa: runContext.qa } : {}),
  };
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
    const input = buildStepInput(step, config, context, runContext.personaKey);
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
  personaKey?: string,
): EndpointRunInput {
  const headers = substitute(step.headers ?? {}, context) as Record<
    string,
    string
  >;
  if (personaKey) headers["x-mock-persona-key"] = personaKey;
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
    mockScenario: config.mockScenario,
    mockLatencyMs: config.mockLatencyMs,
    payload: substitute(step.payload ?? {}, context) as Record<string, unknown>,
    queryParams: substitute(step.queryParams ?? {}, context) as Record<
      string,
      unknown
    >,
    pathParams: substitute(step.pathParams ?? {}, context) as Record<
      string,
      unknown
    >,
    headers,
    expectedResponse: {
      statusCodes: step.expectedStatusCodes ?? [200, 201, 202, 204],
      headers: {},
    },
  };
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

const WHOLE_PLACEHOLDER = /^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/;

function substitute(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    // Un marcador que ocupa todo el valor conserva el tipo (número, objeto…), igual que en la
    // prueba unitaria (`fakers/faker-template.ts`).
    const whole = WHOLE_PLACEHOLDER.exec(value);
    if (whole) {
      const resolved = getPath(context, whole[1]);
      if (resolved !== undefined) return resolved;
    }
    return value.replace(PLACEHOLDER_PATTERN, (match, key) => {
      const resolved = getPath(context, key);
      if (resolved === undefined) return match;
      return typeof resolved === "object"
        ? JSON.stringify(resolved)
        : String(resolved);
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
