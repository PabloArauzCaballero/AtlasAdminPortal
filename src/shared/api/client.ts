import { coordinateSessionRefresh } from "./refresh-coordinator";
import {
  buildRequestInit,
  buildUrl,
  type ApiRequestOptions,
} from "./request-init";
import { extractData, parseJsonSafely, toAtlasApiError } from "./response";
import { fetchWithTimeout } from "./transport";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import { clearStoredInternalSession } from "@/shared/auth/session-storage";
import { sanitizeInternalReturnTo } from "@/shared/auth/return-to";

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const session = getSessionForBrowser();
  const response = await fetchWithTimeout(
    buildUrl(path, options.query),
    buildRequestInit(options, session),
  );
  const payload = await parseJsonSafely(response);

  if (response.ok) return extractData<T>(payload);

  if (canRefreshSession(response.status, options)) {
    const refreshed = await coordinateSessionRefresh(session);
    if (refreshed) return retryRequest<T>(path, options, refreshed);
  }

  handleUnauthorized(response.status, options);
  throw toAtlasApiError(response, payload);
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
  options: ApiRequestOptions,
  session: NonNullable<ReturnType<typeof getSessionForBrowser>>,
): Promise<T> {
  const response = await fetchWithTimeout(
    buildUrl(path, options.query),
    buildRequestInit({ ...options, skipRefresh: true }, session),
  );
  const payload = await parseJsonSafely(response);
  if (response.ok) return extractData<T>(payload);
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
