import type { JsonRecord } from "@/shared/api/types";
import {
  parseJsonRecord,
  parseOptionalJsonValue,
  toStringRecord,
} from "./json-utils";
import type {
  EndpointRunInput,
  EndpointStressRunInput,
  QaExpectedResponse,
} from "./types";

export function parseEndpointRunForm(
  input: RunFormInput,
): ParseResult<EndpointRunInput> {
  const parsed = parseCommonForm(input);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: {
      ...parsed.value,
      dryRun: input.dryRun,
      timeoutMs: clamp(input.timeoutMs, 1_000, 120_000),
      allowMutations: input.allowMutations,
    },
  };
}

export function parseEndpointStressForm(
  input: StressFormInput,
): ParseResult<EndpointStressRunInput> {
  const parsed = parseCommonForm(input);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: {
      ...parsed.value,
      dryRun: input.dryRun,
      targetRps: clamp(input.targetRps, 1, 500),
      durationSeconds: clamp(input.durationSeconds, 1, 3_600),
      concurrency: clamp(input.concurrency, 1, 200),
      rampUpSeconds: clamp(input.rampUpSeconds, 0, 3_600),
      maxRequests: clamp(input.maxRequests, 1, 10_000),
      timeoutMs: clamp(input.timeoutMs, 1_000, 120_000),
      maxErrorRate: normalizePercent(input.maxErrorRatePercent),
      minThroughputRps: positiveOrUndefined(input.minThroughputRps),
      maxAvgMs: positiveOrUndefined(input.maxAvgMs),
      maxP95Ms: positiveOrUndefined(input.maxP95Ms),
      maxP99Ms: positiveOrUndefined(input.maxP99Ms),
      approvalTicket: input.approvalTicket || undefined,
      allowMutations: input.allowMutations,
    },
  };
}

export function expectedStatusesText(value: unknown): string {
  return parseStatusCodes(value).join(", ");
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
type JsonBlockKey = "payload" | "queryParams" | "pathParams" | "headers";
type JsonBlock = [JsonBlockKey, string, string];
type ParsedBlocks = Record<JsonBlockKey, JsonRecord>;

export type CommonFormInput = {
  payload: string;
  queryParams: string;
  pathParams: string;
  headers: string;
  environment: string;
  baseRouteKey: string;
  customHostUrl: string;
  routeOverride: string;
  expectedStatusCodes: string;
  expectedHeaders: string;
  expectedJsonSubset: string;
  expectedBodyContains: string;
  maxLatencyMs: number;
  maxResponseSizeBytes: number;
};

type RunFormInput = CommonFormInput & {
  dryRun: boolean;
  timeoutMs: number;
  allowMutations: boolean;
};

type StressFormInput = RunFormInput & {
  targetRps: number;
  durationSeconds: number;
  concurrency: number;
  rampUpSeconds: number;
  maxRequests: number;
  maxErrorRatePercent: number;
  minThroughputRps: number;
  maxAvgMs: number;
  maxP95Ms: number;
  maxP99Ms: number;
  approvalTicket: string;
};

function parseCommonForm(
  input: CommonFormInput,
): ParseResult<
  Omit<EndpointRunInput, "dryRun" | "timeoutMs" | "allowMutations">
> {
  const target = parseTarget(input);
  if (!target.ok) return target;
  const parsed = parseJsonBlocks([
    ["payload", input.payload, "Payload"],
    ["queryParams", input.queryParams, "Query params"],
    ["pathParams", input.pathParams, "Path params"],
    ["headers", input.headers, "Headers"],
  ]);
  if (!parsed.ok) return parsed;
  const expected = parseExpectedResponse(input);
  if (!expected.ok) return expected;
  return {
    ok: true,
    value: {
      ...target.value,
      payload: parsed.value.payload,
      queryParams: parsed.value.queryParams,
      pathParams: parsed.value.pathParams,
      headers: toStringRecord(parsed.value.headers),
      expectedResponse: expected.value,
    },
  };
}

function parseTarget(input: CommonFormInput) {
  if (input.baseRouteKey === "CUSTOM_HOST") {
    const host = input.customHostUrl.trim();
    if (!host) return { ok: false as const, error: "Host URL es requerido." };
    try {
      const url = new URL(host);
      if (!["http:", "https:"].includes(url.protocol)) {
        return {
          ok: false as const,
          error: "Host URL debe usar http o https.",
        };
      }
    } catch {
      return { ok: false as const, error: "Host URL no es valido." };
    }
  }
  return {
    ok: true as const,
    value: {
      environment: input.environment,
      baseRouteKey: input.baseRouteKey,
      customHostUrl: emptyToUndefined(input.customHostUrl),
      routeOverride: emptyToUndefined(input.routeOverride),
    },
  };
}

function parseExpectedResponse(
  input: CommonFormInput,
): ParseResult<QaExpectedResponse> {
  const headers = parseJsonRecord(input.expectedHeaders, "Headers esperados");
  if (!headers.ok) return headers;
  const jsonSubset = parseOptionalJsonValue(
    input.expectedJsonSubset,
    "JSON esperado",
  );
  if (!jsonSubset.ok) return jsonSubset;
  return {
    ok: true,
    value: {
      statusCodes: parseStatusCodes(input.expectedStatusCodes),
      maxLatencyMs: positiveOrUndefined(input.maxLatencyMs),
      maxResponseSizeBytes: positiveOrUndefined(input.maxResponseSizeBytes),
      bodyContains: emptyToUndefined(input.expectedBodyContains),
      jsonSubset: jsonSubset.value,
      headers: toStringRecord(headers.value),
    },
  };
}

function parseJsonBlocks(blocks: JsonBlock[]): ParseResult<ParsedBlocks> {
  const value = {} as ParsedBlocks;
  for (const [key, text, label] of blocks) {
    const parsed = parseJsonRecord(text, label);
    if (!parsed.ok) return parsed;
    value[key] = parsed.value;
  }
  return { ok: true, value };
}

function parseStatusCodes(value: unknown): number[] {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "200");
  const statuses = raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599);
  return [...new Set(statuses.length ? statuses : [200])].sort((a, b) => a - b);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function normalizePercent(value: number): number | undefined {
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.min(value, 100) / 100;
}

function positiveOrUndefined(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
