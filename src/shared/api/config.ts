const DEFAULT_API_BASE_URL = "http://localhost:3005/api/v1";
const DEFAULT_API_TIMEOUT_MS = 12_000;

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured && configured.length > 0
    ? configured.replace(/\/$/, "")
    : DEFAULT_API_BASE_URL;
}

/**
 * En producción `NEXT_PUBLIC_API_BASE_URL` es obligatorio: sin ella el portal
 * cae al default de desarrollo y el navegador del operador acaba llamando a su
 * propio `localhost`, fallando con un "connection refused" que no explica nada.
 *
 * La validación vive aquí y no dentro de `getApiBaseUrl()` a propósito:
 * `src/middleware.ts` también lo usa para armar la CSP y corre en cada request,
 * así que lanzar allí convertiría un despliegue mal configurado en un 500 total
 * sin UI. Acotado a la ruta de peticiones, el fallo se ve como un error de API
 * con mensaje accionable y el resto del portal sigue renderizando.
 */
export function assertApiBaseUrlConfigured(): void {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured && configured.length > 0) return;

  const environment = (process.env.NEXT_PUBLIC_ATLAS_ENVIRONMENT ?? "").trim();
  if (environment.toLowerCase() === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL no está configurado: en producción el portal no puede caer al API local.",
    );
  }
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
