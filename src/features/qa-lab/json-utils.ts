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
  if (!value || typeof value !== "object") return "{}";
  return JSON.stringify(value, null, 2);
}

export function toStringRecord(value: JsonRecord): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item)]),
  );
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
