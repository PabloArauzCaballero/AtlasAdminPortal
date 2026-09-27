import { getBodyForMethod, generateIdempotencyKey } from "./request-builder";
import { credentialsForAuthMode } from "./qa-safety";
import type { StressRequestSample } from "./stress-result";
import type { DirectStressInput } from "./types";

type BuiltLike = { method: string; headers: Record<string, string> };

/**
 * Cuerpos de la carga. Con «datos distintos por petición» llega un lote del generador y cada
 * petición lleva el siguiente (rotando); sin él, todas llevan el mismo cuerpo.
 */
export function stressBodies(
  method: string,
  input: Pick<DirectStressInput, "payload" | "payloadRotation">,
): (string | undefined)[] {
  const rotation = input.payloadRotation?.length
    ? input.payloadRotation
    : [input.payload];
  return rotation.map((payload) => getBodyForMethod(method, payload));
}

/**
 * Cabeceras de ESTA muestra, no las del plan entero.
 *
 * `built.headers` se arma una sola vez para las miles de peticiones del burst. Reenviarlas tal
 * cual significa que las 10 000 peticiones de un stress comparten la MISMA
 * `x-idempotency-key`: contra un backend real es aceptable (la primera manda, el resto se
 * deduplica), pero contra el mock de proveedores externos (`AtlasExternalProvidersMock`, que
 * reproduce el resultado ante misma clave + mismo cuerpo) convierte el stress en "una petición
 * real y 9999 cachés" — mide la caché de idempotencia, no al proveedor. Por eso cada muestra
 * recibe su propia `x-idempotency-key` y su propia `x-mock-persona-key`: la segunda no afecta a un
 * backend que no la conoce (el mock la usa para aislar estado por persona simulada dentro de la
 * misma corrida; ver el README de `AtlasExternalProvidersMock`).
 */
export function buildInit(
  built: BuiltLike,
  body: string | undefined,
  index: number,
  authMode?: string,
): RequestInit {
  const headers = { ...built.headers };
  if (headers["x-idempotency-key"]) {
    headers["x-idempotency-key"] = generateIdempotencyKey();
  }
  headers["x-mock-persona-key"] = `stress-${index}`;
  return {
    method: built.method,
    headers,
    body,
    credentials: credentialsForAuthMode(authMode),
  };
}

export function buildSample(
  ok: boolean,
  status: number | string,
  started: number,
  runStartedAt: number,
): StressRequestSample {
  return {
    ok,
    latencyMs: Math.round(performance.now() - started),
    elapsedMs: Math.round(performance.now() - runStartedAt),
    statusKey: String(status),
  };
}

export function networkErrorKey(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError")
    return "Timeout";
  return error instanceof Error ? error.name || "NetworkError" : "NetworkError";
}
