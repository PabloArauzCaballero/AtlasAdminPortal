import type { EndpointItem } from "@/features/systems/types";

const SENSITIVE_HEADER_NAMES = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "api-key",
  "proxy-authorization",
  "x-csrf-token",
  "x-xsrf-token",
];

const BLOCKED_CUSTOM_HEADERS = new Set([
  "host",
  "content-length",
  "connection",
  "transfer-encoding",
  "upgrade",
  "origin",
  "referer",
]);

export function isMutatingMethod(method?: string | null): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase());
}

export function sanitizeCustomHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key, value]) => key.trim() && value !== undefined && value !== null)
      .filter(([key]) => !BLOCKED_CUSTOM_HEADERS.has(key.toLowerCase()))
      .map(([key, value]) => [key.trim(), String(value)]),
  );
}

export function redactedHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      isSensitiveHeader(key) ? redactValue(value) : value,
    ]),
  );
}

export function assertRequestAllowed(input: {
  endpoint: EndpointItem;
  method: string;
  environment: string;
  dryRun: boolean;
  allowMutations: boolean;
}): void {
  const environment = input.environment.toUpperCase();
  const mutates =
    isMutatingMethod(input.method) ||
    Boolean(input.endpoint.isDestructive) ||
    input.endpoint.isReadonly === false;

  if (environment === "PRODUCTION_READONLY" && !input.dryRun) {
    throw new Error("Producción readonly solo permite dry-run desde el QA Lab.");
  }

  if (mutates && !input.dryRun && !input.allowMutations) {
    throw new Error(
      "El endpoint puede modificar datos. Activa 'permitir mutación real' para ejecutarlo.",
    );
  }

  if (input.endpoint.testEnvironmentOnly && environment !== "LOCAL") {
    throw new Error("Este endpoint solo puede ejecutarse en ambiente local/testing.");
  }
}

function isSensitiveHeader(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_HEADER_NAMES.some((item) => normalized.includes(item));
}

function redactValue(value: string): string {
  if (!value) return "[redacted]";
  if (value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`;
}
