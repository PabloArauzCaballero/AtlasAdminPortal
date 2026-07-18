import type { EndpointItem } from "@/features/systems/types";
import type { QaExpectedResponse } from "./types";

export type QaAssertion = {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
};

export type AssertionSummary = {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  items: QaAssertion[];
};

export function normalizeExpectedStatuses(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [200];
  const statuses = raw
    .flatMap((item) => String(item).split(","))
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599);
  return [...new Set(statuses.length ? statuses : [200])].sort((a, b) => a - b);
}

export function resolveExpectedStatuses(input: {
  endpoint: EndpointItem;
  expectedResponse?: QaExpectedResponse;
}): number[] {
  return input.expectedResponse?.statusCodes.length
    ? input.expectedResponse.statusCodes
    : normalizeExpectedStatuses(input.endpoint.expectedStatusCodes);
}

export function evaluateEndpointAssertions(
  input: AssertionInput,
): AssertionSummary {
  const expectedStatuses = resolveExpectedStatuses(input);
  const maxLatencyMs = input.expectedResponse?.maxLatencyMs ?? input.timeoutMs;
  const items: QaAssertion[] = [
    {
      name: "Estado HTTP esperado",
      passed: expectedStatuses.includes(input.httpStatus),
      expected: expectedStatuses.join(", "),
      actual: String(input.httpStatus),
    },
    {
      name: "Latencia maxima",
      passed: input.latencyMs <= maxLatencyMs,
      expected: `<= ${maxLatencyMs} ms`,
      actual: `${input.latencyMs} ms`,
    },
    ...evaluateSize(input),
    ...evaluateHeaders(input),
    ...evaluateBodyContains(input),
    ...evaluateJsonSubset(input),
  ];
  const passedCount = items.filter((item) => item.passed).length;
  return {
    passed: passedCount === items.length,
    total: items.length,
    passedCount,
    failedCount: items.length - passedCount,
    items,
  };
}

function evaluateSize(input: AssertionInput): QaAssertion[] {
  const maxBytes = input.expectedResponse?.maxResponseSizeBytes;
  if (!maxBytes) return [];
  return [
    {
      name: "Tamano maximo de respuesta",
      passed: input.responseSizeBytes <= maxBytes,
      expected: `<= ${maxBytes} bytes`,
      actual: `${input.responseSizeBytes} bytes`,
    },
  ];
}

function evaluateHeaders(input: AssertionInput): QaAssertion[] {
  const expected = input.expectedResponse?.headers ?? {};
  const actual = lowerCaseRecord(input.responseHeaders);
  return Object.entries(expected).map(([key, value]) => ({
    name: `Header ${key}`,
    passed: actual[key.toLowerCase()] === value,
    expected: value,
    actual: actual[key.toLowerCase()] ?? "(ausente)",
  }));
}

function evaluateBodyContains(input: AssertionInput): QaAssertion[] {
  const expected = input.expectedResponse?.bodyContains;
  if (!expected) return [];
  // `JSON.stringify(undefined)` devuelve `undefined`, no un string: sin el `??`
  // el `includes` de abajo reventaba el run entero con un TypeError. Una
  // respuesta sin cuerpo simplemente no contiene el texto esperado -> falla.
  const bodyText =
    typeof input.responseBody === "string"
      ? input.responseBody
      : (JSON.stringify(input.responseBody) ?? "");
  return [
    {
      name: "Contenido de respuesta",
      passed: bodyText.includes(expected),
      expected: `contiene ${expected}`,
      actual: bodyText.slice(0, 160),
    },
  ];
}

function evaluateJsonSubset(input: AssertionInput): QaAssertion[] {
  const expected = input.expectedResponse?.jsonSubset;
  if (expected === undefined) return [];
  const passed = containsJsonSubset(input.responseBody, expected);
  return [
    {
      name: "JSON esperado",
      passed,
      expected: JSON.stringify(expected),
      actual: passed ? "coincide" : "no coincide",
    },
  ];
}

function containsJsonSubset(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.every((item, index) => containsJsonSubset(actual[index], item))
    );
  }
  if (isRecord(expected)) {
    if (!isRecord(actual)) return false;
    return Object.entries(expected).every(([key, value]) =>
      containsJsonSubset(actual[key], value),
    );
  }
  return Object.is(actual, expected);
}

function lowerCaseRecord(
  value: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key.toLowerCase(), item]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type AssertionInput = {
  endpoint: EndpointItem;
  expectedResponse?: QaExpectedResponse;
  httpStatus: number;
  latencyMs: number;
  timeoutMs: number;
  responseBody: unknown;
  responseHeaders: Record<string, string>;
  responseSizeBytes: number;
};
