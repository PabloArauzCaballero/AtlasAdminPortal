import type { EndpointItem } from "@/features/systems/types";
import { evaluateEndpointAssertions } from "./assertions";
import { redactedHeaders } from "./qa-safety";
import { sanitizeQaValue } from "./response-sanitizer";
import type { DirectRunResult } from "./types";

const REQUEST_ID_HEADERS = ["x-request-id", "x-correlation-id", "request-id"];

export async function safeParseBody(response: Response): Promise<ParsedBody> {
  const text = await response.text();
  if (!text) return { body: null, sizeBytes: 0 };
  const sizeBytes = new TextEncoder().encode(text).length;
  try {
    return { body: JSON.parse(text) as unknown, sizeBytes };
  } catch {
    return { body: text, sizeBytes };
  }
}

export function buildSuccessDirectResult(
  input: BuildSuccessResultInput,
): DirectRunResult {
  const { endpoint, built, response, parsed, latencyMs, timeoutMs, warnings } =
    input;
  const responseHeaders = collectSafeHeaders(response.headers);
  const responseBody = sanitizeQaValue(parsed.body);
  return {
    url: built.url,
    method: built.method,
    dryRun: false,
    httpStatus: response.status,
    ok: response.ok,
    latencyMs,
    responseBody,
    responseSizeBytes: parsed.sizeBytes,
    responseHeaders,
    responseRequestId: findRequestId(response.headers),
    requestHeaders: redactedHeaders(built.headers),
    assertions: evaluateEndpointAssertions({
      endpoint,
      httpStatus: response.status,
      latencyMs,
      timeoutMs,
      expectedResponse: input.expectedResponse,
      responseBody,
      responseHeaders,
      responseSizeBytes: parsed.sizeBytes,
    }),
    warnings,
  };
}

export function buildDryRunDirectResult(
  built: BuiltRequestLike,
  warnings: string[],
): DirectRunResult {
  return {
    url: built.url,
    method: built.method,
    dryRun: true,
    requestHeaders: redactedHeaders(built.headers),
    warnings,
  };
}

export function buildMissingParamsDirectResult(
  built: BuiltRequestWithParams,
  warnings: string[],
): DirectRunResult {
  return {
    url: built.url,
    method: built.method,
    dryRun: false,
    requestHeaders: redactedHeaders(built.headers),
    warnings,
    error: `Faltan path params: ${built.unresolvedPathParams.join(", ")}`,
  };
}

export function buildErrorDirectResult(
  built: BuiltRequestLike,
  latencyMs: number,
  warnings: string[],
  error: unknown,
): DirectRunResult {
  return {
    url: built.url,
    method: built.method,
    dryRun: false,
    latencyMs,
    requestHeaders: redactedHeaders(built.headers),
    warnings,
    error: normalizeNetworkError(error),
  };
}

export function buildBlockedDirectResult(
  built: BuiltRequestLike,
  dryRun: boolean,
  warnings: string[],
  error: unknown,
): DirectRunResult {
  return {
    url: built.url,
    method: built.method,
    dryRun,
    requestHeaders: redactedHeaders(built.headers),
    warnings,
    error: error instanceof Error ? error.message : "Ejecución bloqueada.",
  };
}

export function collectSafeHeaders(headers: Headers): Record<string, string> {
  return redactedHeaders(Object.fromEntries(headers.entries()));
}

export function findRequestId(headers: Headers): string | undefined {
  for (const key of REQUEST_ID_HEADERS) {
    const value = headers.get(key);
    if (value) return value;
  }
  return undefined;
}

function normalizeNetworkError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Timeout de ejecución alcanzado.";
  }
  return error instanceof Error ? error.message : "Error de red";
}

type ParsedBody = { body: unknown; sizeBytes: number };
type BuiltRequestLike = {
  url: string;
  method: string;
  headers: Record<string, string>;
};
type BuiltRequestWithParams = BuiltRequestLike & {
  unresolvedPathParams: string[];
};
type BuildSuccessResultInput = {
  endpoint: EndpointItem;
  built: BuiltRequestLike;
  response: Response;
  parsed: ParsedBody;
  latencyMs: number;
  timeoutMs: number;
  warnings: string[];
  expectedResponse?: import("./types").QaExpectedResponse;
};
