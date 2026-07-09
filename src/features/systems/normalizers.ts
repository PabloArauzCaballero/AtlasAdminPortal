import type { PaginatedResponse, PaginationMeta } from "@/shared/api/types";
import type {
  DataEntity,
  EndpointDetail,
  EndpointImpact,
  TableImpact,
} from "./types";

const DEFAULT_META: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

export function normalizePaginatedResponse<T>(
  value: unknown,
  aliases: string[],
): PaginatedResponse<T> {
  if (Array.isArray(value)) return withMeta(value, DEFAULT_META);
  if (!isRecord(value)) return withMeta([], DEFAULT_META);

  const items = extractItems<T>(value, aliases);
  const meta = extractMeta(value, items.length);
  return withMeta(items, meta);
}

export function normalizeDataEntity(value: unknown): DataEntity {
  const record = unwrapRecord(value);
  const entityRecord = firstRecord(record, ["entity", "table", "dataEntity"]);
  const entity = (entityRecord ?? record) as DataEntity;
  return {
    ...entity,
    columns: mergeArrays(record, entityRecord, [
      "columns",
      "fields",
      "tableColumns",
      "dataColumns",
    ]),
  };
}

export function normalizeEndpointDetail(value: unknown): EndpointDetail {
  const record = unwrapRecord(value);
  const endpointRecord = firstRecord(record, ["endpoint", "item", "data"]);
  const endpoint = endpointRecord ?? record;
  return {
    endpoint: endpoint as EndpointDetail["endpoint"],
    toolRequirements: mergeArrays(record, endpointRecord, [
      "toolRequirements",
      "requiredTools",
      "tools",
      "requirements",
    ]),
    dataEntityImpacts: mergeArrays(record, endpointRecord, [
      "dataEntityImpacts",
      "tableImpacts",
      "tables",
      "impacts",
    ]),
    fieldImpacts: mergeArrays(record, endpointRecord, [
      "fieldImpacts",
      "fields",
      "columnImpacts",
      "impactedFields",
    ]),
  };
}

export function normalizeEndpointImpact(value: unknown): EndpointImpact {
  const record = unwrapRecord(value);
  return {
    endpoint: (firstRecord(record, ["endpoint", "item"]) ??
      {}) as EndpointImpact["endpoint"],
    tools: mergeArrays(record, null, [
      "tools",
      "toolRequirements",
      "requiredTools",
      "requirements",
    ]),
    tables: mergeArrays(record, null, [
      "tables",
      "dataEntityImpacts",
      "tableImpacts",
      "impacts",
    ]),
    fields: mergeArrays(record, null, [
      "fields",
      "fieldImpacts",
      "columnImpacts",
      "impactedFields",
    ]),
  };
}

export function normalizeTableImpact(value: unknown): TableImpact {
  const record = unwrapRecord(value);
  const entityRecord = firstRecord(record, ["entity", "table", "dataEntity"]);
  return {
    entity: (entityRecord ?? {}) as DataEntity,
    endpointImpacts: mergeArrays(record, entityRecord, [
      "endpointImpacts",
      "relatedEndpoints",
      "endpointRelations",
      "endpoints",
      "items",
      "impacts",
    ]),
    columns: mergeArrays(record, entityRecord, [
      "columns",
      "fields",
      "tableColumns",
      "dataColumns",
    ]),
    governanceConfig: readGovernanceConfig(record, entityRecord),
  } as TableImpact;
}

function unwrapRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  if (isRecord(value.data)) return value.data;
  if (isRecord(value.result)) return value.result;
  return value;
}

function withMeta<T>(items: T[], meta: PaginationMeta): PaginatedResponse<T> {
  return { items, meta: { ...meta, total: meta.total || items.length } };
}

function extractItems<T>(
  record: Record<string, unknown>,
  aliases: string[],
): T[] {
  const direct = extractArray<T>(record, ["items", ...aliases]);
  if (direct.length > 0) return direct;
  const nested = firstRecord(record, ["data", "result", "payload"]);
  return nested ? extractArray<T>(nested, ["items", ...aliases]) : [];
}

function mergeArrays<T>(
  primary: Record<string, unknown>,
  secondary: Record<string, unknown> | null,
  keys: string[],
): T[] {
  return dedupeByStableKey([
    ...extractArray<T>(primary, keys),
    ...(secondary ? extractArray<T>(secondary, keys) : []),
  ]);
}

function extractArray<T>(record: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

function firstRecord(
  record: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }
  return null;
}

function extractMeta(record: Record<string, unknown>, count: number) {
  const source = firstRecord(record, ["meta", "pagination"]);
  if (!source) return { ...DEFAULT_META, total: count };
  const page = toNumber(source.page, 1);
  const limit = toNumber(source.limit, count || 20);
  const total = toNumber(source.total, count);
  return {
    page,
    limit,
    total,
    totalPages: toNumber(
      source.totalPages,
      Math.max(1, Math.ceil(total / limit)),
    ),
  };
}

function readGovernanceConfig(
  record: Record<string, unknown>,
  entity: Record<string, unknown> | null,
) {
  const candidate = record.governanceConfig ?? entity?.governanceConfig;
  return isRecord(candidate) ? candidate : null;
}

function dedupeByStableKey<T>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item, index) => {
    const key = isRecord(item) ? JSON.stringify(item) : String(index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
