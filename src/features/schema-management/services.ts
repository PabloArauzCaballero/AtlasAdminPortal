import { apiRequest } from "@/shared/api/client";
import type { PaginatedResponse, QueryParams } from "@/shared/api/types";
import type {
  ApprovalResult,
  ApproveSchemaChangeInput,
  ProposeSchemaTableInput,
  SchemaChangeLog,
  SchemaTable,
  SchemaVersion,
} from "./types";

function toPaginated<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  const page = Math.floor(offset / Math.max(limit, 1)) + 1;
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
    },
  };
}

export async function listSchemaVersions(
  query: QueryParams,
): Promise<PaginatedResponse<SchemaVersion>> {
  const response = await apiRequest<{
    versions: SchemaVersion[];
    total: number;
    limit: number;
    offset: number;
  }>("/operations/schema/versions", { query });
  return toPaginated(
    response.versions,
    response.total,
    response.limit,
    response.offset,
  );
}

export function getSchemaVersion(versionId: string) {
  return apiRequest<SchemaVersion>(`/operations/schema/versions/${versionId}`);
}

export async function listSchemaTables(
  query: QueryParams,
): Promise<PaginatedResponse<SchemaTable>> {
  const response = await apiRequest<{
    tables: SchemaTable[];
    total: number;
    limit: number;
    offset: number;
    versionId: string;
  }>("/operations/schema/tables", { query });
  return toPaginated(
    response.tables,
    response.total,
    response.limit,
    response.offset,
  );
}

export function getSchemaTable(tableId: string) {
  return apiRequest<SchemaTable>(`/operations/schema/tables/${tableId}`);
}

export function proposeSchemaTable(body: ProposeSchemaTableInput) {
  return apiRequest<SchemaChangeLog>("/operations/schema/tables", {
    method: "POST",
    body,
  });
}

export async function listSchemaChangeLog(
  query: QueryParams,
): Promise<PaginatedResponse<SchemaChangeLog>> {
  const response = await apiRequest<{
    changes: SchemaChangeLog[];
    total: number;
    limit: number;
    offset: number;
  }>("/operations/schema/change-log", { query });
  return toPaginated(
    response.changes,
    response.total,
    response.limit,
    response.offset,
  );
}

export function approveSchemaChange(
  changeId: string,
  body: ApproveSchemaChangeInput,
) {
  return apiRequest<ApprovalResult>(
    `/operations/schema/change-log/${changeId}/approve`,
    { method: "PATCH", body },
  );
}
