import type { JsonRecord } from "@/shared/api/types";

export type JsonParseResult =
  { ok: true; value: JsonRecord } | { ok: false; error: string };
export type JsonValueParseResult =
  { ok: true; value: unknown } | { ok: false; error: string };

export function parseJsonRecord(value: string, label: string): JsonParseResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isJsonRecord(parsed)) {
      return { ok: false, error: `${label} debe ser un objeto JSON.` };
    }
    return { ok: true, value: parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON inválido";
    return { ok: false, error: `${label}: ${message}` };
  }
}

export function parseOptionalJsonValue(
  value: string,
  label: string,
): JsonValueParseResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON invalido";
    return { ok: false, error: `${label}: ${message}` };
  }
}

export function jsonText(value: unknown): string {
  const resolved =
    typeof value === "string" ? tryParseJsonString(value) : value;
  if (!resolved || typeof resolved !== "object") return "{}";
  return JSON.stringify(resolved, null, 2);
}

/**
 * Some backend responses serialize JSONB schema columns (minPayloadSchema,
 * queryParamsSchema, etc.) as a JSON-encoded string instead of a parsed
 * object depending on the query path. Without this, the payload/query
 * textareas silently render "{}" even though real schema data exists.
 */
function tryParseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

export function toStringRecord(value: JsonRecord): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item)]),
  );
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
