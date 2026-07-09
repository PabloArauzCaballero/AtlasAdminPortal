import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type ReportDefinition = {
  reportId: string;
  key: string;
  name: string;
  description: string | null;
  domain: string | null;
  owner: string | null;
  status: string;
  criticality: string | null;
  sourceType: string | null;
  sourceReference: string | null;
  allowedFilters: JsonRecord | null;
  permissions: JsonRecord | null;
  widgets?: ReportWidget[];
  filters?: ReportFilter[];
  updatedAt?: string | null;
};

export type ReportWidget = {
  widgetId: string;
  reportId: string;
  widgetType: string;
  title: string;
  description: string | null;
  queryKey: string | null;
  visualConfig: JsonRecord | null;
  position: JsonRecord | null;
};

export type ReportFilter = {
  filterId: string;
  reportId: string;
  key: string;
  label: string;
  filterType: string;
  required: boolean;
  options: unknown[] | null;
  defaultValue: unknown;
};

export type ReportSnapshot = {
  snapshotId: string;
  reportId: string;
  status: string;
  generatedAt: string | null;
  generatedBy: string | null;
  summary: JsonRecord | null;
};

export type ReportRunResult = {
  reportId: string;
  executionId: string | null;
  status: string;
  generatedAt: string | null;
  data: unknown;
  widgets?: Array<{
    widgetId: string;
    title: string;
    data: unknown;
  }>;
};

export type ReportListResponse = PaginatedResponse<ReportDefinition>;
export type ReportSnapshotListResponse = PaginatedResponse<ReportSnapshot>;
