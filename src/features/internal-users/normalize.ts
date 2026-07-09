import type {
  InternalPermission,
  InternalPermissionsListResponse,
  InternalRole,
  InternalRolesListResponse,
} from "./types";

type UnknownRecord = Record<string, unknown>;

export function normalizeRolesPayload(
  payload: unknown,
): InternalRolesListResponse {
  const items = extractArray(payload, "roles").map(normalizeRole);
  return { items, pagination: getPagination(payload) };
}

export function normalizePermissionsPayload(
  payload: unknown,
): InternalPermissionsListResponse {
  const items = extractArray(payload, "permissions").map(normalizePermission);
  return { items, pagination: getPagination(payload) };
}

function normalizeRole(value: unknown): InternalRole {
  const record = asRecord(value);
  const code = readString(record, ["code", "roleCode", "key", "name"]);
  return {
    id: readString(record, ["id", "roleId", "code"], code),
    code,
    name: readString(record, ["name", "label", "displayName"], code),
    description: readOptionalString(record, ["description", "businessPurpose"]),
    status: readString(record, ["status"], "active"),
    userCount: readNumber(record, ["userCount", "usersCount"]),
    permissions: readStringArray(record, ["permissions", "permissionKeys"]),
  };
}

function normalizePermission(value: unknown): InternalPermission {
  const record = asRecord(value);
  const key = readString(record, ["key", "permissionKey", "code"]);
  return {
    id: readString(record, ["id", "permissionId", "key"], key),
    key,
    name: readString(record, ["name", "label", "displayName"], key),
    description: readOptionalString(record, ["description", "businessPurpose"]),
    module: readString(record, ["module", "domain"], inferModule(key)),
    action: readString(record, ["action"], inferAction(key)),
    status: readString(record, ["status"], "active"),
  };
}

function extractArray(payload: unknown, pluralKey: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const direct = record.items ?? record[pluralKey] ?? record.data;
  if (Array.isArray(direct)) return direct;
  return [];
}

function getPagination(payload: unknown) {
  const pagination = asRecord(payload).pagination;
  return typeof pagination === "object" && pagination !== null
    ? (pagination as InternalRolesListResponse["pagination"])
    : undefined;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function readString(
  record: UnknownRecord,
  keys: string[],
  fallback = "",
): string {
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

function readNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
  }
  return undefined;
}

function readStringArray(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter(isString);
  }
  return [];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function inferModule(key: string) {
  return key.split(".")[0] || "internal";
}

function inferAction(key: string) {
  return key.split(".").at(-1) || "read";
}
