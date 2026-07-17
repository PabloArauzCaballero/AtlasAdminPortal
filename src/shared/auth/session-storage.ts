import {
  isSessionExpired,
  sanitizeSessionForStorage,
} from "./auth-session-policy";
import { emitSessionChange } from "./session-events";
import type { InternalSession } from "./types";

const SESSION_KEY = "atlas_internal_session_v3";
const LEGACY_SESSION_KEY = "atlas_internal_session_v2";
const LEGACY_LOCAL_STORAGE_KEY = "atlas_internal_session_v1";

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function parseSession(raw: string | null): InternalSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<InternalSession>;
    if (!parsed.user?.email || !Array.isArray(parsed.user.permissions)) {
      return null;
    }
    return {
      ...parsed,
      tokenType: parsed.tokenType ?? (parsed.accessToken ? "Bearer" : "Cookie"),
      user: {
        ...parsed.user,
        roles: parsed.user.roles ?? [],
        legacyRoles: parsed.user.legacyRoles ?? [],
        permissions: parsed.user.permissions ?? [],
      },
    } as InternalSession;
  } catch {
    return null;
  }
}

function readLegacySession(storage: Storage): InternalSession | null {
  const fromSession = parseSession(storage.getItem(LEGACY_SESSION_KEY));
  if (fromSession) return fromSession;
  return parseSession(window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY));
}

export function getStoredInternalSession(): InternalSession | null {
  if (typeof window === "undefined") return null;
  const storage = getBrowserStorage();
  if (!storage) return null;

  const current = parseSession(storage.getItem(SESSION_KEY));
  if (current && !isSessionExpired(current)) return current;

  const legacy = readLegacySession(storage);
  if (legacy && !isSessionExpired(legacy)) {
    setStoredInternalSession(legacy);
    return legacy;
  }

  clearStoredInternalSession();
  return null;
}

export function setStoredInternalSession(session: InternalSession): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  storage.setItem(
    SESSION_KEY,
    JSON.stringify(sanitizeSessionForStorage(session)),
  );
  storage.removeItem(LEGACY_SESSION_KEY);
  window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  // Se emite la sesión completa, no la saneada: el estado en memoria conserva
  // los tokens que el almacenamiento puede haber descartado a propósito.
  emitSessionChange(session);
}

export function clearStoredInternalSession(): void {
  const storage = getBrowserStorage();
  storage?.removeItem(SESSION_KEY);
  storage?.removeItem(LEGACY_SESSION_KEY);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  }
  emitSessionChange(null);
}
