import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  JobActionResult,
  JobRunDetail,
  JobRunListResponse,
} from "./types";

export function listJobRuns(query: QueryParams) {
  return apiRequest<JobRunListResponse>("/internal/jobs", { query });
}

export function getJobRun(jobRunId: string) {
  return apiRequest<JobRunDetail>(`/internal/jobs/${jobRunId}`);
}

export function retryJobRun(jobRunId: string) {
  return apiRequest<JobActionResult>(`/internal/jobs/${jobRunId}/retry`, {
    method: "POST",
  });
}

export function cancelJobRun(jobRunId: string) {
  return apiRequest<JobActionResult>(`/internal/jobs/${jobRunId}/cancel`, {
    method: "POST",
  });
}
