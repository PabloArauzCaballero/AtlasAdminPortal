import type {
  InternalAccessProfile,
  InternalAuthResponse,
  InternalSession,
  InternalUser,
} from "./types";

/**
 * Vive aquí y no en `auth-service` a propósito: este módulo solo depende de
 * tipos, así que el cliente API puede normalizar la sesión de un refresh sin
 * crear el ciclo refresh-session -> auth-service -> client -> refresh-session.
 */
export function normalizeInternalSession(
  payload: InternalAuthResponse | InternalAccessProfile,
): InternalSession {
  return {
    ...payload,
    tokenType:
      "tokenType" in payload && payload.tokenType
        ? payload.tokenType
        : "accessToken" in payload && payload.accessToken
          ? "Bearer"
          : "Cookie",
    user: normalizeInternalUser(payload),
  };
}

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
