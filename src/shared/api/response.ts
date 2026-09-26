import { AtlasApiError } from "./errors";
import type { ApiErrorPayload, ApiSuccess } from "./types";

export async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function extractData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return normalizeResponseData((payload as ApiSuccess<T>).data);
  }
  return normalizeResponseData(payload as T);
}

export function toAtlasApiError(
  response: Response,
  payload: unknown,
): AtlasApiError {
  const headerRequestId = getHeaderRequestId(response);
  if (isApiErrorPayload(payload)) {
    return new AtlasApiError({
      status: response.status,
      code: payload.error.code,
      message: payload.error.message,
      requestId: payload.requestId ?? headerRequestId,
      payload,
    });
  }

  return new AtlasApiError({
    status: response.status,
    code: `HTTP_${response.status}`,
    message: "No se pudo completar la operación.",
    requestId: headerRequestId,
  });
}

function normalizeResponseData<T>(data: T): T {
  if (!data || typeof data !== "object") return data;
  const record = data as Record<string, unknown>;
  const hasItems = Array.isArray(record.items);
  const hasPagination =
    typeof record.pagination === "object" && record.pagination !== null;
  if (hasItems && hasPagination && !("meta" in record)) {
    return { ...record, meta: record.pagination } as T;
  }
  return data;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== "object") return false;
  const error = (value as Record<string, unknown>).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function getHeaderRequestId(response: Response): string | undefined {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("x-correlation-id") ??
    undefined
  );
}

/** Código del error de una mutación cuyo resultado no se pudo confirmar. */
export const UNKNOWN_OUTCOME_CODE = "UNKNOWN_OUTCOME";

export const UNKNOWN_OUTCOME_MESSAGE =
  "No pudimos confirmar si la operación se guardó: el sistema no respondió como esperábamos. Antes de volver a hacerla, revise si ya aparece registrada; si no la encuentra o tiene dudas, avise a soporte.";

/**
 * Una mutación que se mandó y de la que no volvió una respuesta del backend que confirme o niegue el
 * resultado. «Inténtelo otra vez» sería el consejo equivocado: podría ejecutarla dos veces.
 */
export function unknownOutcomeError(
  status: number,
  response?: Response,
): AtlasApiError {
  return new AtlasApiError({
    status,
    code: UNKNOWN_OUTCOME_CODE,
    message: UNKNOWN_OUTCOME_MESSAGE,
    requestId: response ? getHeaderRequestId(response) : undefined,
  });
}

/**
 * Un 2xx que no cumple el contrato: cuerpo que no es JSON (una página HTML de un proxy o de un
 * inicio de sesión, un JSON cortado) o un sobre `{ success: false }`. Devuelve `null` si el 2xx es
 * válido; un 204 o un cuerpo vacío lo son (`payload === null`).
 */
export function invalidSuccessError(
  response: Response,
  payload: unknown,
  mutation: boolean,
): AtlasApiError | null {
  if (typeof payload === "string") {
    if (mutation) return unknownOutcomeError(response.status, response);
    return new AtlasApiError({
      status: response.status,
      code: "INVALID_RESPONSE",
      message:
        "La respuesta del sistema no se pudo leer. Inténtelo otra vez; si sigue, avise a soporte.",
      requestId: getHeaderRequestId(response),
    });
  }
  if (
    payload &&
    typeof payload === "object" &&
    (payload as Record<string, unknown>).success === false
  ) {
    if (isApiErrorPayload(payload)) return toAtlasApiError(response, payload);
    return new AtlasApiError({
      status: response.status,
      code: "REJECTED_WITHOUT_REASON",
      message:
        "El sistema rechazó la operación sin explicar el motivo. Si sigue, avise a soporte.",
      requestId: getHeaderRequestId(response),
    });
  }
  return null;
}
