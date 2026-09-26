import type { EndpointItem } from "@/features/systems/types";
import { getApiTimeoutMs, getCsrfHeaderName } from "@/shared/api/config";
import type { JsonRecord } from "@/shared/api/types";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import { getQaMockProvidersBaseUrl, resolveQaBaseRoute } from "./base-routes";
import { getQaDeviceProfile } from "./qa-device-profiles";
import {
  isHostAllowed,
  isMutatingMethod,
  sanitizeCustomHeaders,
} from "./qa-safety";

const PATH_PARAM_PATTERN = /:([a-zA-Z0-9_]+)|\{([a-zA-Z0-9_]+)\}/g;

export type BuiltQaRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  unresolvedPathParams: string[];
  hostAllowed: boolean;
};

export function buildQaRequest(
  endpoint: EndpointItem,
  input: QaRequestInput,
): BuiltQaRequest {
  const method = (endpoint.method || "GET").toUpperCase();
  const rawPath =
    input.routeOverride || endpoint.fullPath || endpoint.routePath || "";
  // Sólo se sustituye dentro del PATH, nunca en `protocol://host:port`: cuando `rawPath` es una
  // URL absoluta (un endpoint del mock, o un operador que pegó una URL completa con puerto
  // explícito en "Ruta/path del endpoint"), el patrón `:([a-zA-Z0-9_]+)` de más abajo matchea
  // igual de bien un `:id` de ruta que el `:4010` de un puerto — sin este split, una URL como
  // `http://localhost:4010/...` se reportaba con el path param inexistente "4010" sin resolver.
  const { prefix, toSubstitute } = splitOriginFromPath(rawPath);
  const { path: substitutedPath, unresolvedPathParams } = substitutePathParams(
    toSubstitute,
    input.pathParams,
  );
  const path = `${prefix}${substitutedPath}`;
  const url = buildUrl(input, path);
  const hostAllowed = isHostAllowed(url);
  return {
    url,
    method,
    headers: buildHeaders(method, input.headers, input, hostAllowed, url),
    unresolvedPathParams,
    hostAllowed,
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
  /** Escenario a forzar en `AtlasExternalProvidersMock` (`x-mock-scenario`). Ignorado por cualquier otro host. */
  mockScenario?: string;
  /** Latencia exacta a forzar en el mock (`x-mock-latency-ms`), en ms. Ignorado por cualquier otro host. */
  mockLatencyMs?: number;
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

/**
 * Separa `protocol://host:port` (que nunca debe pasar por la sustitución de `:param`) del resto
 * de la URL. Para un path relativo, `prefix` queda vacío y `toSubstitute` es la cadena entera —
 * mismo comportamiento que antes de que existiera esta función.
 */
function splitOriginFromPath(rawPath: string): {
  prefix: string;
  toSubstitute: string;
} {
  if (!isAbsoluteHttpUrl(rawPath)) return { prefix: "", toSubstitute: rawPath };
  const origin = new URL(rawPath).origin;
  return { prefix: origin, toSubstitute: rawPath.slice(origin.length) };
}

/**
 * Junta base y path SIN inventar `/api/v1`.
 *
 * `/api/v1` sólo se inyecta cuando ni la base ni el path lo traen ya: es el caso normal de
 * "Local backend raiz" (`http://localhost:3005`) contra un path de catálogo como `/health`.
 *
 * La base del servidor de mocks de proveedores externos (`MOCK_PROVIDERS`,
 * `http://localhost:4010/mock`, ver `getQaMockProvidersBaseUrl` en `base-routes.ts`) es la única
 * base configurada del portal que trae un path propio distinto de `/api/v1`, así que se excluye
 * explícitamente en vez de inferir "cualquier base con path" — una `CUSTOM_HOST` escrita a mano
 * por el operador con un prefijo propio (p. ej. un gateway) sigue recibiendo `/api/v1` como
 * siempre. Sin esta excepción, `http://localhost:4010/mock` + `/segip/identity/verify` se convertía
 * en `http://localhost:4010/mock/api/v1/segip/identity/verify`, que en el emulador es un 404
 * `ROUTE_NOT_FOUND` — la llamada nunca llegaba a rutear, y el QA Lab jamás pudo "cablearse" con el
 * mock aunque el resto de la petición estuviera bien armada.
 */
function joinApiBaseAndPath(baseUrl: string, rawPath: string): string {
  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  const cleanPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const baseHasApiPrefix = /\/api\/v1$/i.test(cleanBase);
  const pathHasApiPrefix = /^\/api\/v1(\/|$)/i.test(cleanPath);

  if (baseHasApiPrefix && pathHasApiPrefix) {
    return `${cleanBase}${cleanPath.replace(/^\/api\/v1/i, "") || "/"}`;
  }

  if (baseHasApiPrefix || pathHasApiPrefix || isMockProvidersBase(cleanBase)) {
    return `${cleanBase}${cleanPath}`;
  }

  return `${cleanBase}/api/v1${cleanPath}`;
}

/** true si la base es (o coincide con) la del servidor de mocks de proveedores externos. */
function isMockProvidersBase(baseUrl: string): boolean {
  return (
    baseUrl.toLowerCase() ===
    getQaMockProvidersBaseUrl().toLowerCase().replace(/\/+$/, "")
  );
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
    | "mockScenario"
    | "mockLatencyMs"
  >,
  hostAllowed: boolean,
  url: string,
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
  applyAuthOverride(headers, overrides, session, hostAllowed);
  if (isMutatingMethod(method) && includeIdempotencyKey) {
    headers["x-idempotency-key"] = generateIdempotencyKey();
  }
  const csrfHeaderName = getCsrfHeaderName();
  if (
    csrfHeaderName &&
    hostAllowed &&
    isMutatingMethod(method) &&
    overrides.authMode !== "none" &&
    session?.csrfToken
  ) {
    headers[csrfHeaderName] = session.csrfToken;
  }
  // Sólo van al host del mock: mandarlos a un backend real es ruido inofensivo, pero acotarlos evita
  // confundir un log de AtlasBackend con cabeceras que sólo `AtlasExternalProvidersMock` entiende.
  if (isMockProvidersHost(url)) {
    if (overrides.mockScenario)
      headers["x-mock-scenario"] = overrides.mockScenario;
    if (overrides.mockLatencyMs && overrides.mockLatencyMs > 0) {
      headers["x-mock-latency-ms"] = String(
        Math.round(overrides.mockLatencyMs),
      );
    }
  }
  return headers;
}

function isMockProvidersHost(url: string): boolean {
  try {
    return new URL(url).host === new URL(getQaMockProvidersBaseUrl()).host;
  } catch {
    return false;
  }
}

function applyAuthOverride(
  headers: Record<string, string>,
  overrides: Pick<QaRequestInput, "authMode" | "customAuthToken">,
  session: ReturnType<typeof getStoredInternalSession>,
  hostAllowed: boolean,
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
  // El token real de sesión nunca se adjunta a un host fuera de la allowlist,
  // ni siquiera para construir el preview de un dry-run.
  if (session?.accessToken && hostAllowed) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `qa-lab-${crypto.randomUUID()}`;
  }
  return `qa-lab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
