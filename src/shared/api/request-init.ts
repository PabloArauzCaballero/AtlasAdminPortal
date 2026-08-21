import { getApiBaseUrl, getCsrfHeaderName } from "./config";
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
};

function isMutatingMethod(method?: string): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  return !["GET", "HEAD", "OPTIONS"].includes(normalized);
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
    ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    ...options.headers,
  };

  if (!options.skipAuth && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  appendCsrfHeader(headers, session, options.method);
  // La llave solo tiene sentido en mutaciones; en un GET se ignora.
  if (options.idempotencyKey && isMutatingMethod(options.method)) {
    headers["Idempotency-Key"] = options.idempotencyKey;
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
