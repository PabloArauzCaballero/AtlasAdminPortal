import type { InternalSession } from "./types";

export type InternalAuthStorageMode = "auto" | "cookie" | "session";

export function getInternalAuthStorageMode(): InternalAuthStorageMode {
  const configured = process.env.NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE;
  return configured === "cookie" || configured === "session"
    ? configured
    : "auto";
}

export function shouldPersistSessionTokens(session: InternalSession): boolean {
  const mode = getInternalAuthStorageMode();
  if (mode === "cookie") return false;
  if (mode === "session") return true;
  return session.tokenType !== "Cookie";
}

export function sanitizeSessionForStorage(
  session: InternalSession,
): InternalSession {
  if (shouldPersistSessionTokens(session)) return session;
  const safe: InternalSession = { ...session, tokenType: "Cookie" };
  delete safe.accessToken;
  delete safe.refreshToken;
  return safe;
}

export function getSessionExpiresAt(session: InternalSession | null) {
  return session?.session?.expiresAt ?? null;
}

export function isSessionExpired(session: InternalSession | null): boolean {
  const expiresAt = getSessionExpiresAt(session);
  if (!expiresAt) return false;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

export function isCookieBackedSession(
  session: InternalSession | null,
): boolean {
  return session?.tokenType === "Cookie" && !session.accessToken;
}
