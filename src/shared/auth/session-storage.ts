import {
  isSessionExpired,
  sanitizeSessionForStorage,
} from "./auth-session-policy";
import { emitSessionChange } from "./session-events";
import type { InternalSession } from "./types";

const SESSION_KEY = "atlas_internal_session_v3";
const LEGACY_SESSION_KEY = "atlas_internal_session_v2";
const LEGACY_LOCAL_STORAGE_KEY = "atlas_internal_session_v1";
/** Esta pestaña cerró sesión: no se recupera la sesión del servidor sin pasar por el login. */
const LOGGED_OUT_KEY = "atlas_internal_logged_out";
/** El aviso que el login enseña una vez: por qué se cerró la sesión. */
const LOGOUT_NOTICE_KEY = "atlas_internal_logout_notice";

/**
 * Por qué terminó la sesión, para contarlo en el login (ADM-06, auditoría 2026-10-09).
 * `serverConfirmed: false` significa que el backend no confirmó el cierre tras varios intentos: la
 * cookie de sesión puede seguir viva hasta que caduque.
 */
export type LogoutNotice = {
  reason: "user" | "idle";
  serverConfirmed: boolean;
};

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
  storage.removeItem(LOGGED_OUT_KEY);
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

/**
 * Marca esta pestaña como «cerró sesión». Sin la marca, el shell protegido volvía a entrar solo:
 * al quedarse sin sesión pide `/internal/auth/me` con la cookie `HttpOnly`, y si el backend no
 * había llegado a revocarla, la sesión «cerrada» volvía sin pedir credenciales. La borra el
 * siguiente login (`setStoredInternalSession`).
 */
export function markLoggedOutHere(): void {
  getBrowserStorage()?.setItem(LOGGED_OUT_KEY, "1");
}

export function wasLoggedOutHere(): boolean {
  return getBrowserStorage()?.getItem(LOGGED_OUT_KEY) === "1";
}

/** Se emite al escribir un aviso: el login puede estar ya montado cuando llega el veredicto. */
export const LOGOUT_NOTICE_EVENT = "atlas:logout-notice";

export function setLogoutNotice(notice: LogoutNotice): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  storage.setItem(LOGOUT_NOTICE_KEY, JSON.stringify(notice));
  window.dispatchEvent(new Event(LOGOUT_NOTICE_EVENT));
}

/** Lee el aviso y lo borra: se enseña una sola vez. */
export function consumeLogoutNotice(): LogoutNotice | null {
  const storage = getBrowserStorage();
  const raw = storage?.getItem(LOGOUT_NOTICE_KEY);
  if (!storage || !raw) return null;
  storage.removeItem(LOGOUT_NOTICE_KEY);
  try {
    const parsed = JSON.parse(raw) as Partial<LogoutNotice>;
    if (parsed.reason !== "user" && parsed.reason !== "idle") return null;
    return {
      reason: parsed.reason,
      serverConfirmed: parsed.serverConfirmed !== false,
    };
  } catch {
    return null;
  }
}
