import { getApiBaseUrl, getCsrfHeaderName } from "./config";
import { getCurrentScreen } from "./current-screen";
import type { QueryParams } from "./types";
import type { InternalSession } from "@/shared/auth/types";

export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  query?: QueryParams;
  headers?: Record<string, string>;
  tenantId?: string;
  skipAuth?: boolean;
  skipRefresh?: boolean;
  /**
   * Llave de idempotencia para mutaciones. Se genera una vez por acción del
   * usuario y se reenvía en cada reintento para que el backend deduplique.
   */
  idempotencyKey?: string;
  /** Slug del flujo de Flujos que origina la llamada; viaja como `x-atlas-flow` para la correlación. */
  flow?: string;
};

export function isMutatingMethod(method?: string): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  return !["GET", "HEAD", "OPTIONS"].includes(normalized);
}

/**
 * La cabecera que lee AtlasBackend (`runtime-hardening/idempotency.interceptor.ts`). Antes el cliente
 * mandaba `Idempotency-Key`, que el backend ignoraba: la llave viajaba y nadie deduplicaba.
 */
export const IDEMPOTENCY_HEADER = "x-idempotency-key";

const IDEMPOTENCY_HEADER_NAMES = new Set([
  "x-idempotency-key",
  "idempotency-key",
]);

/**
 * La llave de la petición, venga por `idempotencyKey` o puesta a mano en `headers` (con cualquier
 * mayúscula). Así una mutación con llave a mano también se repite de forma segura.
 */
export function idempotencyKeyOf(
  options: ApiRequestOptions,
): string | undefined {
  if (options.idempotencyKey) return options.idempotencyKey;
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    if (IDEMPOTENCY_HEADER_NAMES.has(name.toLowerCase()) && value) return value;
  }
  return undefined;
}

function withoutIdempotencyHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).filter(
      ([name]) => !IDEMPOTENCY_HEADER_NAMES.has(name.toLowerCase()),
    ),
  );
}

function appendCsrfHeader(
  headers: Record<string, string>,
  session: InternalSession | null,
  method?: string,
) {
  const headerName = getCsrfHeaderName();
  if (!headerName || !isMutatingMethod(method) || !session?.csrfToken) return;
  headers[headerName] = session.csrfToken;
}

/**
 * El origen contra el que se resuelve una base RELATIVA.
 *
 * `NEXT_PUBLIC_API_BASE_URL` puede configurarse como `/api/v1` —es como se despliega el portal
 * detrás de su propio proxy, y lo que permite exponerlo por un túnel sin exponer la API—, pero
 * `new URL()` exige una URL absoluta y lanzaba `Failed to construct 'URL': Invalid URL` en CADA
 * llamada: el portal entero quedaba inutilizable y el login sólo decía "No se pudo iniciar sesión".
 *
 * Una base relativa significa «el mismo origen que sirve esta página». Fuera del navegador no hay
 * `location` que consultar, y entonces se falla diciendo qué variable configurar.
 */
function resolveOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin)
    return window.location.origin;
  throw new Error(
    "La API no está configurada para llamadas desde el servidor: define NEXT_PUBLIC_API_BASE_URL con una URL absoluta.",
  );
}

export function buildUrl(path: string, query?: QueryParams): string {
  const joined = joinApiBaseAndPath(getApiBaseUrl(), path);
  const url = /^https?:\/\//i.test(joined)
    ? new URL(joined)
    : new URL(joined.startsWith("/") ? joined : `/${joined}`, resolveOrigin());
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function joinApiBaseAndPath(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
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

export function buildRequestInit(
  options: ApiRequestOptions,
  session: InternalSession | null,
): RequestInit {
  const headers = buildHeaders(options, session);
  const init: RequestInit = {
    ...copyRequestOptions(options),
    headers,
    cache: "no-store",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    init.body =
      typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);
  }

  return init;
}

function buildHeaders(
  options: ApiRequestOptions,
  session: InternalSession | null,
): Record<string, string> {
  const tenantId =
    options.tenantId ??
    session?.user.tenantId ??
    process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;
  const headers: Record<string, string> = {
    Accept: "application/json",
    // Identifica al portal ante el backend. Los correos de código y de cambio de contraseña los
    // redacta AtlasBackend, así que sin esto su membrete sale con un rótulo genérico y quien
    // recibe un PIN pedido desde aquí no puede confirmar a qué portal está entrando.
    "x-atlas-product": "admin-portal",
    // Un id por request, generado aquí: el middleware del backend lo acepta (patrón corto y seguro)
    // y lo guarda en system_action_logs, así una pantalla puede correlacionar lo que hizo con lo
    // que el backend registró. Antes el portal sólo LEÍA el id que la respuesta traía.
    "x-correlation-id": newCorrelationId(),
    // La pantalla de origen. Explícita si quien llama la pasa; si no, la que esté abierta. El
    // backend la guarda en `origin_screen` y con eso una pantalla pasa de «existe en el código» a
    // «alguien la usó»; sin ninguna de las dos, no viaja nada y el backend registra un nulo.
    ...((options.flow ?? getCurrentScreen())
      ? { "x-atlas-flow": (options.flow ?? getCurrentScreen()) as string }
      : {}),
    ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    ...withoutIdempotencyHeaders(options.headers),
  };

  if (!options.skipAuth && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  appendCsrfHeader(headers, session, options.method);
  // La llave solo tiene sentido en mutaciones; en un GET se ignora. Una sola cabecera, con el
  // nombre que lee el backend, venga la llave por la opción o puesta a mano.
  const idempotencyKey = idempotencyKeyOf(options);
  if (idempotencyKey && isMutatingMethod(options.method)) {
    headers[IDEMPOTENCY_HEADER] = idempotencyKey;
  }
  return headers;
}

function copyRequestOptions(options: ApiRequestOptions): RequestInit {
  return {
    method: options.method,
    credentials: options.credentials ?? "include",
    integrity: options.integrity,
    keepalive: options.keepalive,
    mode: options.mode,
    priority: options.priority,
    redirect: options.redirect,
    referrer: options.referrer,
    referrerPolicy: options.referrerPolicy,
    signal: options.signal,
    window: options.window,
  };
}

/** `crypto.randomUUID` no existe en todo contexto (SSR viejo, pruebas): el respaldo cumple igual el patrón del backend. */
function newCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
