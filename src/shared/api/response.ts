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
