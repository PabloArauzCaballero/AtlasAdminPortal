import type { JsonRecord } from "@/shared/api/types";

export type ContractRow = { name: string; type: string; description: string };

export function toRows(value: unknown): ContractRow[] {
  const resolved =
    typeof value === "string" ? tryParseJsonString(value) : value;
  if (!resolved) return [];
  if (Array.isArray(resolved)) return resolved.map(rowFromUnknown);
  if (isRecord(resolved)) return rowsFromRecord(resolved);
  return [
    { name: "valor", type: typeof resolved, description: String(resolved) },
  ];
}

/**
 * Some backend responses serialize JSONB schema columns as a JSON-encoded
 * string instead of a parsed object depending on the query path. Without
 * this, contract tables silently render as empty even with real data.
 */
function tryParseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function rowsFromRecord(record: JsonRecord): ContractRow[] {
  const properties = isRecord(record.properties) ? record.properties : record;
  return Object.entries(properties).map(([name, value]) => ({
    name,
    type: resolveType(value),
    description: resolveDescription(value),
  }));
}

function rowFromUnknown(value: unknown, index: number): ContractRow {
  if (!isRecord(value)) {
    return {
      name: String(index + 1),
      type: typeof value,
      description: String(value),
    };
  }
  return {
    name: String(value.name ?? value.field ?? value.key ?? index + 1),
    type: resolveType(value),
    description: resolveDescription(value),
  };
}

function resolveType(value: unknown): string {
  if (!isRecord(value)) return typeof value;
  const type = value.type ?? value.dataType ?? value.format ?? value.statusCode;
  if (Array.isArray(type)) return type.join(" | ");
  return typeof type === "string" || typeof type === "number"
    ? String(type)
    : "object";
}

function resolveDescription(value: unknown): string {
  if (!isRecord(value)) return String(value);
  const description =
    value.description ?? value.businessDescription ?? value.summary;
  return typeof description === "string" ? description : "—";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
