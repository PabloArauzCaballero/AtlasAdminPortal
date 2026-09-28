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

/**
 * El texto que una pantalla enseña cuando su petición falla.
 *
 * Varias pantallas decían «Reintenta en unos segundos» ante CUALQUIER error, también ante un 403: la
 * persona reintentaba, volvía a fallar y nadie sabía que lo que faltaba era un permiso. El servidor
 * ya explica en `message` qué pasó (qué permiso falta, qué campo sobra); se enseña eso, y el texto
 * genérico sólo cuando el fallo no llegó del servidor (red caída, respuesta ilegible).
 */
export function apiErrorText(error: unknown, fallback: string): string {
  if (!isAtlasApiError(error)) return fallback;
  if (error.status === 403)
    return `${error.message} Pide el acceso a quien administra los usuarios internos; reintentar no lo cambia.`;
  return error.message || fallback;
}
