import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type JobRunSummary = {
  jobRunId: string;
  jobKey: string;
  name: string;
  queue: string | null;
  status: string;
  durationMs: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string | null;
  metadata?: JsonRecord | null;
};

export type JobRunLog = {
  timestamp: string | null;
  level: string;
  message: string;
  details?: JsonRecord | null;
};

export type JobRunDetail = JobRunSummary & {
  requestId: string | null;
  payloadSummary: JsonRecord | null;
  resultSummary: JsonRecord | null;
  errorCode: string | null;
  errorMessage: string | null;
  logs: JobRunLog[];
};

export type JobActionResult = {
  jobRunId: string;
  status: string;
  message?: string | null;
};

/**
 * `summary.byStatus` cuenta TODAS las corridas del filtro, no sólo la página: es lo que alimenta
 * las tarjetas «Fallidas» y «En ejecución». Opcional mientras el backend desplegado no lo mande.
 */
export type JobRunListResponse = PaginatedResponse<JobRunSummary> & {
  summary?: { byStatus: Record<string, number> };
};
