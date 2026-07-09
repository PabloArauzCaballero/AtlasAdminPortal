import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type DataExportSummary = {
  exportId: string;
  name: string;
  resourceType: string;
  resourceId: string | null;
  format: string;
  status: string;
  requestedBy: string | null;
  requestedAt: string | null;
  finishedAt: string | null;
  expiresAt: string | null;
  downloadUrl?: string | null;
  metadata?: JsonRecord | null;
};

export type DataExportDetail = DataExportSummary & {
  reason: string | null;
  filters: JsonRecord | null;
  policySnapshot: JsonRecord | null;
  auditRequestId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type DataExportListResponse = PaginatedResponse<DataExportSummary>;
