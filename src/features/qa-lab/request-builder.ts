import type { EndpointItem } from "@/features/systems/types";
import { getApiTimeoutMs, getCsrfHeaderName } from "@/shared/api/config";
import type { JsonRecord } from "@/shared/api/types";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import { resolveQaBaseRoute } from "./base-routes";
import { getQaDeviceProfile } from "./qa-device-profiles";
import { isMutatingMethod, sanitizeCustomHeaders } from "./qa-safety";

const PATH_PARAM_PATTERN = /:([a-zA-Z0-9_]+)|\{([a-zA-Z0-9_]+)\}/g;

export type BuiltQaRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  unresolvedPathParams: string[];
};

export function buildQaRequest(
  endpoint: EndpointItem,
  input: QaRequestInput,
): BuiltQaRequest {
  const method = (endpoint.method || "GET").toUpperCase();
  const rawPath =
    input.routeOverride || endpoint.fullPath || endpoint.routePath || "";
  const { path, unresolvedPathParams } = substitutePathParams(
    rawPath,
    input.pathParams,
  );
  return {
    url: buildUrl(input, path),
    method,
    headers: buildHeaders(method, input.headers, input),
    unresolvedPathParams,
  };
}

export function getBodyForMethod(
  method: string,
  payload: JsonRecord,
): string | undefined {
  return isMutatingMethod(method) ? JSON.stringify(payload ?? {}) : undefined;
}

export function effectiveTimeoutMs(timeoutMs?: number): number {
  return Number.isFinite(timeoutMs) && Number(timeoutMs) >= 1_000
    ? Math.min(Number(timeoutMs), 120_000)
    : getApiTimeoutMs();
}

type QaRequestInput = {
  environment: string;
  baseRouteKey?: string;
  customHostUrl?: string;
  routeOverride?: string;
  pathParams: JsonRecord;
  queryParams: JsonRecord;
  headers: Record<string, string>;
  authMode?: "session" | "none" | "invalid" | "custom";
  customAuthToken?: string;
  includeTenantHeader?: boolean;
  includeIdempotencyKey?: boolean;
  deviceProfile?: string;
};

function buildUrl(input: QaRequestInput, rawPath: string): string {
  if (isAbsoluteHttpUrl(rawPath)) {
    const absoluteUrl = new URL(rawPath);
    Object.entries(input.queryParams).forEach(([key, value]) =>
      appendQueryParam(absoluteUrl, key, value),
    );
    return absoluteUrl.toString();
  }
  const baseUrl = resolveQaBaseRoute({
    environment: input.environment,
    baseRouteKey: input.baseRouteKey,
    customHostUrl: input.customHostUrl,
  });
  const url = new URL(joinApiBaseAndPath(baseUrl, rawPath));
  Object.entries(input.queryParams).forEach(([key, value]) =>
    appendQueryParam(url, key, value),
  );
  return url.toString();
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function joinApiBaseAndPath(baseUrl: string, rawPath: string): string {
  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  const cleanPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const baseHasApiPrefix = /\/api\/v1$/i.test(cleanBase);
  const pathHasApiPrefix = /^\/api\/v1(\/|$)/i.test(cleanPath);

  if (baseHasApiPrefix && pathHasApiPrefix) {
    return `${cleanBase}${cleanPath.replace(/^\/api\/v1/i, "") || "/"}`;
  }

  if (!baseHasApiPrefix && !pathHasApiPrefix) {
    return `${cleanBase}/api/v1${cleanPath}`;
  }

  return `${cleanBase}${cleanPath}`;
}

function appendQueryParam(url: URL, key: string, value: unknown): void {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryParam(url, key, item));
    return;
  }
  if (typeof value === "object") {
    url.searchParams.append(key, JSON.stringify(value));
    return;
  }
  url.searchParams.append(key, String(value));
}

function substitutePathParams(path: string, params: JsonRecord) {
  const unresolved = new Set<string>();
  const substituted = path.replace(PATH_PARAM_PATTERN, (match, a, b) => {
    const key = String(a ?? b);
    const value = params[key];
    if (value === undefined || value === null || value === "") {
      unresolved.add(key);
      return match;
    }
    return encodeURIComponent(String(value));
  });
  return { path: substituted, unresolvedPathParams: [...unresolved] };
}

function buildHeaders(
  method: string,
  customHeaders: Record<string, string>,
  overrides: Pick<
    QaRequestInput,
    | "authMode"
    | "customAuthToken"
    | "includeTenantHeader"
    | "includeIdempotencyKey"
    | "deviceProfile"
  >,
): Record<string, string> {
  const session = getStoredInternalSession();
  const safeCustomHeaders = sanitizeCustomHeaders(customHeaders);
  const includeTenantHeader = overrides.includeTenantHeader !== false;
  const includeIdempotencyKey = overrides.includeIdempotencyKey !== false;
  const deviceHeaders = getQaDeviceProfile(overrides.deviceProfile).headers;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(includeTenantHeader && session?.user.tenantId
      ? { "x-tenant-id": session.user.tenantId }
      : {}),
    ...deviceHeaders,
    ...safeCustomHeaders,
  };
  applyAuthOverride(headers, overrides, session);
  if (isMutatingMethod(method) && includeIdempotencyKey) {
    headers["x-idempotency-key"] = generateIdempotencyKey();
  }
  const csrfHeaderName = getCsrfHeaderName();
  if (
    csrfHeaderName &&
    isMutatingMethod(method) &&
    overrides.authMode !== "none" &&
    session?.csrfToken
  ) {
    headers[csrfHeaderName] = session.csrfToken;
  }
  return headers;
}

function applyAuthOverride(
  headers: Record<string, string>,
  overrides: Pick<QaRequestInput, "authMode" | "customAuthToken">,
  session: ReturnType<typeof getStoredInternalSession>,
): void {
  const mode = overrides.authMode ?? "session";
  if (mode === "none") return;
  if (mode === "invalid") {
    headers.Authorization = "Bearer qa-invalid-token-0000000000";
    return;
  }
  if (mode === "custom" && overrides.customAuthToken?.trim()) {
    headers.Authorization = `Bearer ${overrides.customAuthToken.trim()}`;
    return;
  }
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `qa-lab-${crypto.randomUUID()}`;
  }
  return `qa-lab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
