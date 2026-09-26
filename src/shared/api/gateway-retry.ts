import { AtlasApiError } from "./errors";

/**
 * Reintento de lo que falla porque el API no estaba, no porque dijera que no.
 *
 * ## Por qué existe
 *
 * Cada despliegue de AtlasBackend deja el API sin servir mientras Coolify cambia los contenedores:
 * para los viejos antes de levantar los nuevos, y entre medias nadie responde a `atlas-backend`.
 * Medido el 2026-09-13: 77 s antes de ajustar el compose, 12-36 s después. En ese hueco la petición
 * del navegador la contesta lo que hay delante del API: la reescritura de `next.config.ts` con un
 * `Internal Server Error` en texto plano, o Traefik con `404 page not found` si el que se despliega
 * es el propio portal. AtlasBackend despliega varias veces al día.
 *
 * Sin esto, el operador veía «No se pudo completar la operación» a mitad de su trabajo. Y si el token
 * caducaba en ese momento, el refresco fallaba igual y `refresh-session.ts` BORRABA LA SESIÓN: un
 * despliegue mandaba a todo el que estuviera trabajando a la pantalla de login.
 *
 * ## Cómo se sabe que contestó la pasarela
 *
 * Por el cuerpo. AtlasBackend responde SIEMPRE con su sobre JSON —incluso un 404 de una ruta que no
 * existe trae `requestId`—. Si `parseJsonSafely` no devuelve un objeto, esa respuesta no la escribió
 * el API.
 *
 * ## Qué se repite
 *
 *  - GET/HEAD, o una mutación con `idempotencyKey`: ante cualquier fallo transitorio, incluido un corte
 *    de red o un timeout. La llave es la misma en cada intento y el backend deduplica.
 *  - Cualquier otra mutación: sólo si la pasarela contestó 404/500/502/503. Nunca ante un timeout, un
 *    corte o un 504: ahí la petición pudo llegar y ejecutarse sin que volviera la respuesta.
 */

export const GATEWAY_RETRY_BUDGET_MS = 45_000;

const DELAYS_MS = [1_000, 2_000, 3_000, 5_000, 8_000];

/** Dispersión de cada espera: al acabar un despliegue no vuelven todas las pestañas a la vez. */
const JITTER = 0.25;

const GATEWAY_STATUSES = new Set([404, 500, 502, 503, 504]);

/** Sin el 504: un plazo agotado en la pasarela no dice si el API llegó a recibir la petición. */
const UNDELIVERED_STATUSES = new Set([404, 500, 502, 503]);

export type RetryMode = "safe" | "undelivered-only";

export type SentRequest = { response: Response; payload: unknown };

export function retryModeFor(
  method: string | undefined,
  idempotencyKey: string | undefined,
): RetryMode {
  const normalized = (method ?? "GET").toUpperCase();
  const readOnly = normalized === "GET" || normalized === "HEAD";
  return readOnly || Boolean(idempotencyKey) ? "safe" : "undelivered-only";
}

/** La respuesta la produjo lo que está delante del API, no el API. */
export function isGatewayResponse(
  response: Response,
  payload: unknown,
): boolean {
  return (
    GATEWAY_STATUSES.has(response.status) &&
    (payload === null || typeof payload !== "object")
  );
}

/** `fetchWithTimeout` traduce a status 0 el corte de red y el plazo agotado. */
function isTransportFailure(error: unknown): error is AtlasApiError {
  return error instanceof AtlasApiError && error.status === 0;
}

export function deservesRetry(
  outcome: SentRequest | unknown,
  mode: RetryMode,
): boolean {
  if (isSentRequest(outcome)) {
    const { response, payload } = outcome;
    if (!isGatewayResponse(response, payload)) return false;
    return mode === "safe" || UNDELIVERED_STATUSES.has(response.status);
  }
  return mode === "safe" && isTransportFailure(outcome);
}

export function delayBeforeAttempt(
  attempt: number,
  random: () => number = Math.random,
): number {
  const base = DELAYS_MS[Math.min(attempt - 1, DELAYS_MS.length - 1)] as number;
  return Math.round(base * (1 - JITTER + random() * JITTER * 2));
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Envía y repite mientras el resultado lo merezca y quede presupuesto.
 *
 * Al agotarse devuelve la ÚLTIMA respuesta —o relanza el último error de transporte— para que el flujo
 * normal de `apiRequest` la convierta en el error que la pantalla ya sabe pintar. Una cancelación de
 * arriba (TanStack Query al desmontar) no es un fallo: se relanza al instante.
 */
export async function sendWithGatewayRetry(
  send: () => Promise<SentRequest>,
  options: {
    mode: RetryMode;
    signal?: AbortSignal | null;
    budgetMs?: number;
    now?: () => number;
  },
): Promise<SentRequest> {
  const now = options.now ?? Date.now;
  const deadline = now() + (options.budgetMs ?? GATEWAY_RETRY_BUDGET_MS);

  for (let attempt = 1; ; attempt++) {
    let outcome: SentRequest | unknown;
    let failed = false;
    try {
      outcome = await send();
    } catch (error) {
      if (!isTransportFailure(error)) throw error;
      outcome = error;
      failed = true;
    }

    const delay = delayBeforeAttempt(attempt);
    const retry =
      deservesRetry(outcome, options.mode) &&
      !options.signal?.aborted &&
      now() + delay <= deadline;

    if (!retry) {
      if (failed) throw outcome;
      return outcome as SentRequest;
    }
    await sleep(delay, options.signal);
  }
}

function isSentRequest(value: unknown): value is SentRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "response" in value &&
    (value as SentRequest).response instanceof Response
  );
}
