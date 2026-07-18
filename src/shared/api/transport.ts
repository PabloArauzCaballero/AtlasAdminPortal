import { getApiTimeoutMs } from "./config";
import { AtlasApiError } from "./errors";

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);

  if (upstreamSignal?.aborted) abortFromUpstream();
  else {
    upstreamSignal?.addEventListener("abort", abortFromUpstream, {
      once: true,
    });
  }

  // `timedOut` distingue el abort del timeout interno del que viene de arriba
  // (el usuario, o TanStack Query al desmontar). Sin esta marca, `toNetworkError`
  // mapeaba **cualquier** AbortError a REQUEST_TIMEOUT, así que una petición que
  // nadie dejó terminar reportaba "la solicitud tardó demasiado" — un timeout
  // que nunca ocurrió. (Flagueado desde la baseline / FASE 8.)
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, getApiTimeoutMs());

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    // Cancelación de arriba: se re-lanza el abort original para conservar la
    // semántica de cancelación (TanStack Query lo trata como cancelado, no como
    // error). Solo el timeout interno se traduce a REQUEST_TIMEOUT.
    if (upstreamSignal?.aborted && !timedOut) {
      throw (
        upstreamSignal.reason ??
        new DOMException("The operation was aborted.", "AbortError")
      );
    }
    throw toNetworkError(error);
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}

export async function rawFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);

  if (upstreamSignal?.aborted) abortFromUpstream();
  else {
    upstreamSignal?.addEventListener("abort", abortFromUpstream, {
      once: true,
    });
  }

  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}

function toNetworkError(error: unknown): AtlasApiError {
  if (error instanceof AtlasApiError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AtlasApiError({
      status: 0,
      code: "REQUEST_TIMEOUT",
      message:
        "La solicitud tardó demasiado. Revisa el servicio interno o intenta nuevamente.",
    });
  }

  return new AtlasApiError({
    status: 0,
    code: "NETWORK_ERROR",
    message:
      "No se pudo conectar con el servicio interno. Revisa la conexión o el ambiente configurado.",
  });
}
