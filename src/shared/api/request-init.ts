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

export function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(joinApiBaseAndPath(getApiBaseUrl(), path));
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
    ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    ...options.headers,
  };

  if (!options.skipAuth && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  appendCsrfHeader(headers, session, options.method);
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
