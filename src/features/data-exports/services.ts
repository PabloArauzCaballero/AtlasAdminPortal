import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { DataExportDetail, DataExportListResponse } from "./types";

export function listDataExports(query: QueryParams) {
  return apiRequest<DataExportListResponse>("/internal/exports", { query });
}

export function getDataExport(exportId: string) {
  return apiRequest<DataExportDetail>(`/internal/exports/${exportId}`);
}
