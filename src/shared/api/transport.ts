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

  const timeout = setTimeout(() => controller.abort(), getApiTimeoutMs());

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
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
