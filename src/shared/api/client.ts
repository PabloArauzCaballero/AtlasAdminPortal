import type { ZodType } from "zod";
import { validateContract } from "./contract";
import { coordinateSessionRefresh } from "./refresh-coordinator";
import {
  buildRequestInit,
  buildUrl,
  type ApiRequestOptions,
} from "./request-init";
import { extractData, parseJsonSafely, toAtlasApiError } from "./response";
import { fetchWithTimeout } from "./transport";
import { reportEvent } from "@/shared/observability/reporter";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import { clearStoredInternalSession } from "@/shared/auth/session-storage";
import { sanitizeInternalReturnTo } from "@/shared/auth/return-to";

/**
 * Pasar `schema` valida la respuesta 2xx contra el contrato esperado: si no
 * coincide, lanza ApiContractError en vez de devolver datos inválidos. Es
 * opcional para no forzar la migración de todos los servicios de golpe.
 */
type RequestOptions<T> = ApiRequestOptions & { schema?: ZodType<T> };

export async function apiRequest<T>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const session = getSessionForBrowser();
  const response = await fetchWithTimeout(
    buildUrl(path, options.query),
    buildRequestInit(options, session),
  );
  const payload = await parseJsonSafely(response);

  if (response.ok) return finalizeResponse<T>(payload, response, path, options);

  if (canRefreshSession(response.status, options)) {
    const refreshed = await coordinateSessionRefresh(session);
    if (refreshed) return retryRequest<T>(path, options, refreshed);
    reportEvent("refresh_fail", new Error("Refresh de sesión fallido"), {
      endpoint: path,
    });
  }

  handleUnauthorized(response.status, options);
  throw toAtlasApiError(response, payload);
}

function finalizeResponse<T>(
  payload: unknown,
  response: Response,
  path: string,
  options: RequestOptions<T>,
): T {
  const data = extractData<T>(payload);
  if (!options.schema) return data;
  try {
    return validateContract(options.schema, data, {
      endpoint: path,
      method: (options.method ?? "GET").toUpperCase(),
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  } catch (error) {
    reportEvent("contract_error", error, { endpoint: path });
    throw error;
  }
}

function getSessionForBrowser() {
  return typeof window !== "undefined" ? getStoredInternalSession() : null;
}

function canRefreshSession(
  status: number,
  options: ApiRequestOptions,
): boolean {
  return !options.skipAuth && !options.skipRefresh && status === 401;
}

async function retryRequest<T>(
  path: string,
  options: RequestOptions<T>,
  session: NonNullable<ReturnType<typeof getSessionForBrowser>>,
): Promise<T> {
  const response = await fetchWithTimeout(
    buildUrl(path, options.query),
    buildRequestInit({ ...options, skipRefresh: true }, session),
  );
  const payload = await parseJsonSafely(response);
  if (response.ok) return finalizeResponse<T>(payload, response, path, options);
  handleUnauthorized(response.status, options);
  throw toAtlasApiError(response, payload);
}

/**
 * Varias peticiones pueden fallar con 401 a la vez; sin este lock cada una
 * dispararía su propio replace() a login. No se resetea a propósito: la
 * navegación recarga el módulo.
 */
let redirectingToLogin = false;

function handleUnauthorized(status: number, options: ApiRequestOptions) {
  if (status !== 401 || options.skipAuth || typeof window === "undefined")
    return;
  clearStoredInternalSession();
  if (window.location.pathname === "/internal/login") return;
  if (redirectingToLogin) return;

  redirectingToLogin = true;
  const current = `${window.location.pathname}${window.location.search}`;
  const returnTo = sanitizeInternalReturnTo(current);
  window.location.replace(
    `/internal/login?reason=session_expired&returnTo=${encodeURIComponent(returnTo)}`,
  );
}

/** Libera el lock de redirección. Pensado para aislar tests entre sí. */
export function resetLoginRedirectLock(): void {
  redirectingToLogin = false;
}
