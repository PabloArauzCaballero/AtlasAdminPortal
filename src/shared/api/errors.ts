import type { ApiErrorPayload } from "./types";

export class AtlasApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly payload?: ApiErrorPayload;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
    payload?: ApiErrorPayload;
  }) {
    super(input.message);
    this.name = "AtlasApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.payload = input.payload;
  }
}

export function isAtlasApiError(error: unknown): error is AtlasApiError {
  return error instanceof AtlasApiError;
}
