import type { ApiErrorPayload } from "./types";

export class AtlasApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly payload?: ApiErrorPayload;
  /**
   * Cuánto pidió esperar el servidor antes de repetir (`Retry-After` de un 409 o un 429), en
   * milisegundos. Sólo existe si la cabecera llegó y es legible: con la API en otro origen el
   * navegador la oculta salvo que Core la exponga, y entonces quien reintenta usa su propia espera.
   */
  readonly retryAfterMs?: number;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
    payload?: ApiErrorPayload;
    retryAfterMs?: number;
  }) {
    super(input.message);
    this.name = "AtlasApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.payload = input.payload;
    this.retryAfterMs = input.retryAfterMs;
  }
}

export function isAtlasApiError(error: unknown): error is AtlasApiError {
  return error instanceof AtlasApiError;
}
