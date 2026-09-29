import type { EndpointItem } from "@/features/systems/types";
import { rawFetch } from "@/shared/api/transport";
import {
  buildBlockedDirectResult,
  buildDryRunDirectResult,
  buildErrorDirectResult,
  buildMissingParamsDirectResult,
  buildSuccessDirectResult,
  collectSafeHeaders,
  findRequestId,
  safeParseBody,
} from "./direct-result";
import {
  buildQaRequest,
  effectiveTimeoutMs,
  getBodyForMethod,
} from "./request-builder";
import {
  assertAuthModeUsable,
  assertHostAllowed,
  assertRequestAllowed,
  credentialsForAuthMode,
  redactedHeaders,
} from "./qa-safety";
import {
  buildPinoLogFileName,
  createQaPinoLogger,
  type QaPinoLogger,
} from "./pino-log";
import type { DirectRunInput, DirectRunResult } from "./types";

export async function executeEndpointDirectly(
  endpoint: EndpointItem,
  input: DirectRunInput,
): Promise<DirectRunResult> {
  const logger = createQaPinoLogger(endpoint.endpointId || endpoint.code);
  let built: BuiltRequest;
  try {
    built = buildQaRequest(endpoint, input);
  } catch (error) {
    // Una base mal configurada hacía que `new URL()` lanzara FUERA del try y el operador sólo
    // veía «No se pudo ejecutar el endpoint». Ahora el motivo llega al resultado.
    logger
      .child("builder")
      .error("request.invalid", "Dirección inválida", error);
    return withLogs(
      buildBlockedDirectResult(
        {
          url:
            input.routeOverride ||
            endpoint.fullPath ||
            endpoint.routePath ||
            "",
          method: (endpoint.method || "GET").toUpperCase(),
          headers: {},
        },
        input.dryRun,
        [],
        new Error(
          `No se pudo armar la dirección de la petición (${error instanceof Error ? error.message : "dirección inválida"}). Revisa el ambiente y la ruta base elegidos.`,
        ),
      ),
      logger,
    );
  }
  const warnings = buildWarnings(built.unresolvedPathParams);
  const timeoutMs = effectiveTimeoutMs(input.timeoutMs);
  logBuildLayer(logger, endpoint, input, built, warnings);

  try {
    assertAuthModeUsable(input);
    assertHostAllowed(built.url);
    assertRequestAllowed({
      endpoint,
      method: built.method,
      environment: input.environment,
      dryRun: input.dryRun,
      allowMutations: input.allowMutations,
    });
    logger.child("safety").info("request.allowed", "Petición permitida");
  } catch (error) {
    logger
      .child("safety")
      .error("request.blocked", "Petición bloqueada", error);
    return withLogs(
      buildBlockedDirectResult(built, input.dryRun, warnings, error),
      logger,
    );
  }

  if (input.dryRun) {
    logger
      .child("transport")
      .info("request.dry_run", "Simulación: no sale ninguna petición");
    return withLogs(buildDryRunDirectResult(built, warnings), logger);
  }
  if (built.unresolvedPathParams.length > 0) {
    logger
      .child("builder")
      .warn("path_params.missing", "Faltan datos de la ruta", {
        unresolved: built.unresolvedPathParams,
      });
    return withLogs(buildMissingParamsDirectResult(built, warnings), logger);
  }
  return executeFetch(endpoint, input, built, timeoutMs, warnings, logger);
}

async function executeFetch(
  endpoint: EndpointItem,
  input: DirectRunInput,
  built: BuiltRequest,
  timeoutMs: number,
  warnings: string[],
  logger: QaPinoLogger,
): Promise<DirectRunResult> {
  const body = getBodyForMethod(built.method, input.payload);
  const startedAt = performance.now();
  logger
    .child("transport")
    .info("request.sent", "El portal envía la petición", {
      method: built.method,
      url: built.url,
      headers: redactedHeaders(built.headers),
      hasBody: Boolean(body),
      timeoutMs,
    });
  try {
    const response = await rawFetch(
      built.url,
      buildInit(built, body, input.authMode),
      timeoutMs,
    );
    const latencyMs = Math.round(performance.now() - startedAt);
    const parsed = await safeParseBody(response);
    logResponse(logger, response, parsed.sizeBytes, latencyMs);
    return withLogs(
      buildSuccessDirectResult({
        endpoint,
        built,
        response,
        parsed,
        latencyMs,
        timeoutMs,
        warnings,
        expectedResponse: input.expectedResponse,
      }),
      logger,
    );
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    logger
      .child("transport")
      .error("response.error", "Error de red o tiempo agotado", {
        latencyMs,
        error,
      });
    return withLogs(
      buildErrorDirectResult(built, latencyMs, warnings, error),
      logger,
    );
  }
}

function buildInit(
  built: BuiltRequest,
  body: string | undefined,
  authMode?: string,
): RequestInit {
  return {
    method: built.method,
    headers: built.headers,
    body,
    credentials: credentialsForAuthMode(authMode),
  };
}

function buildWarnings(unresolvedPathParams: string[]): string[] {
  return unresolvedPathParams.length > 0
    ? [`Faltan datos de la ruta: ${unresolvedPathParams.join(", ")}.`]
    : [];
}

function logResponse(
  logger: QaPinoLogger,
  response: Response,
  sizeBytes: number,
  latencyMs: number,
): void {
  logger.child("transport").info("response.received", "El servidor respondió", {
    status: response.status,
    ok: response.ok,
    latencyMs,
    sizeBytes,
    requestId: findRequestId(response.headers),
    headers: collectSafeHeaders(response.headers),
  });
}

function logBuildLayer(
  logger: QaPinoLogger,
  endpoint: EndpointItem,
  input: DirectRunInput,
  built: BuiltRequest,
  warnings: string[],
): void {
  logger.child("form").info("form.parsed", "Formulario de QA recibido", {
    environment: input.environment,
    baseRouteKey: input.baseRouteKey,
    dryRun: input.dryRun,
    timeoutMs: input.timeoutMs,
  });
  logger.child("builder").info("request.built", "Petición construida", {
    endpointId: endpoint.endpointId,
    method: built.method,
    url: built.url,
    headers: redactedHeaders(built.headers),
    warnings,
  });
}

function withLogs<T extends DirectRunResult>(
  result: T,
  logger: QaPinoLogger,
): T {
  return {
    ...result,
    pinoLogFileName: buildPinoLogFileName("qa-direct", logger.runId),
    pinoLogLines: logger.lines(),
  };
}

type BuiltRequest = ReturnType<typeof buildQaRequest>;
