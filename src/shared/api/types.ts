export type ApiSuccess<T> = {
  requestId?: string;
  data: T;
  timestamp: string;
};

export type ApiErrorPayload = {
  requestId?: string;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type QueryPrimitive = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryPrimitive>;

export type JsonRecord = Record<string, unknown>;
