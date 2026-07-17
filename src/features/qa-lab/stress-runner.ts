import type { EndpointItem } from "@/features/systems/types";
import { rawFetch } from "@/shared/api/transport";
import { resolveExpectedStatuses } from "./assertions";
import {
  buildQaRequest,
  effectiveTimeoutMs,
  getBodyForMethod,
} from "./request-builder";
import {
  assertHostAllowed,
  assertRequestAllowed,
  redactedHeaders,
} from "./qa-safety";
import {
  buildStressResult,
  dryRunStressResult,
  type StressRequestSample,
} from "./stress-result";
import {
  buildStressWarnings,
  normalizeStressPlan,
  runPacedRequests,
  type StressPlan,
} from "./stress-plan";
import {
  buildPinoLogFileName,
  createQaPinoLogger,
  type QaPinoLogger,
} from "./pino-log";
import type { DirectStressInput, DirectStressResult } from "./types";

const MIN_APPROVAL_TICKET_LENGTH = 5;

export async function runStressBurst(
  endpoint: EndpointItem,
  input: DirectStressInput,
): Promise<DirectStressResult> {
  // `info` como mínimo: el detalle por muestra es `debug` y en un stress de
  // miles de requests solo sirve para inflar memoria y congelar el visor.
  const logger = createQaPinoLogger(endpoint.endpointId || endpoint.code, {
    minLevel: "info",
  });
  const built = buildQaRequest(endpoint, input);
  const warnings = buildStressWarnings(input, built.unresolvedPathParams);
  const plan = normalizeStressPlan(input);
  const expectedStatuses = resolveExpectedStatuses({
    endpoint,
    expectedResponse: input.expectedResponse,
  });
  logStressPlan(logger, endpoint, input, built, plan, warnings);
  assertStressAllowed(endpoint, input, built, logger);
  if (built.unresolvedPathParams.length > 0 && !input.dryRun) {
    throw new Error(
      `Faltan path params: ${built.unresolvedPathParams.join(", ")}`,
    );
  }
  if (input.dryRun) {
    logger.child("transport").info("stress.dry_run", "Dry-run sin fetch real");
    return withLogs(dryRunStressResult(built, plan, warnings), logger);
  }
  return executeStressPlan(
    built,
    input,
    plan,
    expectedStatuses,
    effectiveTimeoutMs(input.timeoutMs),
    warnings,
    logger,
  );
}

function assertStressAllowed(
  endpoint: EndpointItem,
  input: DirectStressInput,
  built: BuiltRequest,
  logger: QaPinoLogger,
): void {
  try {
    assertHostAllowed(built.url);
  } catch (error) {
    logger.child("safety").error("stress.blocked", "Host no permitido", error);
    throw error;
  }
  assertRequestAllowed({
    endpoint,
    method: built.method,
    environment: input.environment,
    dryRun: input.dryRun,
    allowMutations: input.allowMutations,
  });
  if (!input.dryRun && !hasApprovalTicket(input.approvalTicket)) {
    logger
      .child("safety")
      .error("stress.blocked", "Falta ticket de aprobación");
    throw new Error(
      "El stress real requiere ticket de aprobación para auditoría operativa.",
    );
  }
  logger.child("safety").info("stress.allowed", "Stress permitido");
}

async function executeStressPlan(
  built: BuiltRequest,
  input: DirectStressInput,
  plan: StressPlan,
  expectedStatuses: number[],
  timeoutMs: number,
  warnings: string[],
  logger: QaPinoLogger,
): Promise<DirectStressResult> {
  const body = getBodyForMethod(built.method, input.payload);
  const samples: StressRequestSample[] = [];
  const startedAt = performance.now();
  logger.child("transport").info("stress.started", "Front inicia stress", {
    url: built.url,
    method: built.method,
    headers: redactedHeaders(built.headers),
    timeoutMs,
  });
  await runPacedRequests(plan, async () => {
    samples.push(
      await executeStressRequest(
        built,
        body,
        timeoutMs,
        startedAt,
        expectedStatuses,
        logger,
      ),
    );
  });
  return withLogs(
    buildStressResult({
      built,
      input,
      plan,
      samples,
      durationMs: Math.round(performance.now() - startedAt),
      warnings,
    }),
    logger,
  );
}

async function executeStressRequest(
  built: BuiltRequest,
  body: string | undefined,
  timeoutMs: number,
  runStartedAt: number,
  expectedStatuses: number[],
  logger: QaPinoLogger,
): Promise<StressRequestSample> {
  const started = performance.now();
  try {
    const response = await rawFetch(
      built.url,
      buildInit(built, body),
      timeoutMs,
    );
    await response.arrayBuffer().catch(() => undefined);
    const sample = buildSample(
      expectedStatuses.includes(response.status),
      response.status,
      started,
      runStartedAt,
    );
    logger
      .child("transport")
      .debug("stress.sample", "Backend respondió muestra", sample);
    return sample;
  } catch (error) {
    const sample = buildSample(
      false,
      networkErrorKey(error),
      started,
      runStartedAt,
    );
    // Una muestra fallida sí es señal: se emite como `warn` para que sobreviva
    // al gate de nivel, a diferencia de las muestras correctas.
    logger.child("transport").warn("stress.sample_error", "Error en muestra", {
      ...sample,
      error,
    });
    return sample;
  }
}

function buildInit(built: BuiltRequest, body: string | undefined): RequestInit {
  return {
    method: built.method,
    headers: built.headers,
    body,
    credentials: "include",
  };
}

function buildSample(
  ok: boolean,
  status: number | string,
  started: number,
  runStartedAt: number,
): StressRequestSample {
  return {
    ok,
    latencyMs: Math.round(performance.now() - started),
    elapsedMs: Math.round(performance.now() - runStartedAt),
    statusKey: String(status),
  };
}

function networkErrorKey(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError")
    return "Timeout";
  return error instanceof Error ? error.name || "NetworkError" : "NetworkError";
}

function hasApprovalTicket(value?: string): boolean {
  return Boolean(value && value.trim().length >= MIN_APPROVAL_TICKET_LENGTH);
}

function logStressPlan(
  logger: QaPinoLogger,
  endpoint: EndpointItem,
  input: DirectStressInput,
  built: BuiltRequest,
  plan: StressPlan,
  warnings: string[],
): void {
  logger.child("form").info("stress.form", "Formulario stress recibido", {
    environment: input.environment,
    baseRouteKey: input.baseRouteKey,
    dryRun: input.dryRun,
    approvalTicket: input.approvalTicket ? "present" : "missing",
  });
  logger.child("stress-plan").info("stress.plan", "Plan de stress construido", {
    endpointId: endpoint.endpointId,
    url: built.url,
    method: built.method,
    plan,
    warnings,
  });
}

function withLogs<T extends DirectStressResult>(
  result: T,
  logger: QaPinoLogger,
): T {
  return {
    ...result,
    pinoLogFileName: buildPinoLogFileName("qa-stress", logger.runId),
    pinoLogLines: logger.lines(),
  };
}

type BuiltRequest = ReturnType<typeof buildQaRequest>;
