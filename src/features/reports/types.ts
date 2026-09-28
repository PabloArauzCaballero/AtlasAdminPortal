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

/** Una línea de un widget ya calculado: una etiqueta legible y su valor. */
export type ReportWidgetEntry = { label: string; value: number | string };

export type ReportWidgetData = {
  /** `metrics`: cifras sueltas; `breakdown`: conteo por categoría; `rows`: filas de detalle. */
  kind: "metrics" | "breakdown" | "rows";
  entries: ReportWidgetEntry[];
};

/**
 * Lo que devuelve `POST /internal/reports/:id/run`. El informe se calcula en vivo y no se guarda:
 * no hay `executionId` ni `status` (el tipo anterior los declaraba y el backend nunca los mandó).
 */
export type ReportRunResult = {
  reportId: string;
  computedAt: string;
  persisted: false;
  appliedFilters?: Record<string, unknown>;
  widgets: Array<{
    widgetId: string;
    title: string;
    data: ReportWidgetData | Record<string, unknown>;
  }>;
};

export type ReportListResponse = PaginatedResponse<ReportDefinition>;
