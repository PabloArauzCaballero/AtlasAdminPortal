import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type JobRunSummary = {
  jobRunId: string;
  jobKey: string;
  name: string;
  queue: string | null;
  status: string;
  priority: string | null;
  attempts: number | null;
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

export type JobRunListResponse = PaginatedResponse<JobRunSummary>;
