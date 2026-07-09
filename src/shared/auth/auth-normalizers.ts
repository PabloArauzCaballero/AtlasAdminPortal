import type { InternalAuthResponse, InternalUser } from "./types";

export function normalizeInternalUser(
  payload: InternalAuthResponse,
): InternalUser {
  const user = payload.user;
  const rawUser = user as unknown as Record<string, unknown>;
  return {
    ...user,
    roles: normalizeTextList(rawUser.roles),
    legacyRoles: normalizeTextList(rawUser.legacyRoles),
    permissions: normalizeTextList(
      rawUser.permissions ??
        rawUser.effectivePermissions ??
        rawUser.permissionKeys ??
        payload.permissions,
    ),
  };
}

function normalizeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (isRecord(item)) return item.key ?? item.code ?? item.name;
      return null;
    })
    .filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
}

function isRecord(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
