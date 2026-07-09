import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  ReportDefinition,
  ReportListResponse,
  ReportRunResult,
  ReportSnapshotListResponse,
} from "./types";

export function listReports(query: QueryParams) {
  return apiRequest<ReportListResponse>("/internal/reports", { query });
}

export function getReport(reportId: string) {
  return apiRequest<ReportDefinition>(`/internal/reports/${reportId}`);
}

export function runReport(reportId: string, filters: unknown) {
  return apiRequest<ReportRunResult>(`/internal/reports/${reportId}/run`, {
    method: "POST",
    body: { filters },
  });
}

export function listReportSnapshots(reportId: string, query: QueryParams) {
  return apiRequest<ReportSnapshotListResponse>(
    `/internal/reports/${reportId}/snapshots`,
    { query },
  );
}
