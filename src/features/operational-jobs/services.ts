import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { JobRunDetail, JobRunListResponse } from "./types";

/**
 * Sólo lectura, y a propósito.
 *
 * `POST /internal/jobs/:id/retry` y `/cancel` los retiró AtlasBackend porque devolvían 200 sobre
 * acciones que no ocurrían (`internal-portal.controller.ts`). El portal siguió pintando los dos
 * botones durante semanas: primero prometían y no hacían nada, después prometían y daban 404.
 * Un job se relanza desde `POST /operations/jobs/<job>` (runtime-jobs), que es un disparo nuevo con
 * su propia auditoría, no un «reintento» de una corrida vieja.
 */
export function listJobRuns(query: QueryParams) {
  return apiRequest<JobRunListResponse>("/internal/jobs", { query });
}

export function getJobRun(jobRunId: string) {
  return apiRequest<JobRunDetail>(`/internal/jobs/${jobRunId}`);
}
