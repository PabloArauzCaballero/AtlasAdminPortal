import { isSafeInternalPath } from "@/shared/lib/urls";
import type { GlobalSearchResponse, GlobalSearchResult } from "./types";

type UnknownRecord = Record<string, unknown>;

export function normalizeSearchPayload(payload: unknown): GlobalSearchResponse {
  const items = extractItems(payload).map(normalizeResult);
  return { items, totals: extractTotals(payload, items) };
}

function normalizeResult(value: unknown): GlobalSearchResult {
  const record = asRecord(value);
  const kind = readString(record, ["kind", "type", "resourceType"], "Recurso");
  const title = readString(record, ["title", "label", "name", "key"], kind);
  return {
    id: readString(record, ["id", "resourceId"], title),
    kind,
    title,
    subtitle: readOptionalString(record, [
      "subtitle",
      "description",
      "summary",
    ]),
    href: readSafeHref(record),
    status: readOptionalString(record, ["status", "reviewStatus"]),
    method: readOptionalString(record, ["method"]),
    riskLevel: readOptionalString(record, ["riskLevel", "criticality"]),
    containsPii: readOptionalBoolean(record, ["containsPii", "pii"]),
  };
}

/**
 * El `href` llega del backend y termina en un `<Link>`: sin validar, un
 * `javascript:` o un `//host` externo convertiría un resultado de búsqueda en
 * una redirección abierta. Si no es una ruta interna segura se devuelve `null`
 * y la tarjeta se pinta como texto no navegable.
 */
function readSafeHref(record: UnknownRecord): string | null {
  const href = readString(record, ["href", "url", "path"], "");
  return isSafeInternalPath(href) ? href : null;
}

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const items = record.items ?? record.results ?? record.data;
  return Array.isArray(items) ? items : [];
}

function extractTotals(payload: unknown, items: GlobalSearchResult[]) {
  const totals = asRecord(payload).totals;
  if (totals && typeof totals === "object")
    return totals as Record<string, number>;
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function readString(record: UnknownRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function readOptionalString(record: UnknownRecord, keys: string[]) {
  const value = readString(record, keys);
  return value || null;
}

function readOptionalBoolean(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}
