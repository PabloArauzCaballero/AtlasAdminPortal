const DEFAULT_API_BASE_URL = "http://localhost:3005/api/v1";
const DEFAULT_API_TIMEOUT_MS = 12_000;

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured && configured.length > 0
    ? configured.replace(/\/$/, "")
    : DEFAULT_API_BASE_URL;
}

export function getApiTimeoutMs(): number {
  const configured = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1_000
    ? configured
    : DEFAULT_API_TIMEOUT_MS;
}

export function getCsrfHeaderName(): string | null {
  const configured = process.env.NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME?.trim();
  return configured && configured.length > 0 ? configured : null;
}

/**
 * Hosts extra (host[:puerto]) a los que el QA Lab puede enviar peticiones
 * autenticadas, además de las bases propias del portal. Coma-separado.
 */
export function getQaAllowedHosts(): string[] {
  return (process.env.NEXT_PUBLIC_QA_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}
