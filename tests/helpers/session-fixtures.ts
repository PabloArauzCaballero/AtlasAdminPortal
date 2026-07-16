import type { InternalSession, InternalUser } from "@/shared/auth/types";

export function makeUser(overrides: Partial<InternalUser> = {}): InternalUser {
  return {
    id: "usr_test_1",
    email: "user@example.invalid",
    fullName: "Usuario De Prueba",
    status: "active",
    roles: ["operator"],
    permissions: ["systems.read"],
    ...overrides,
  };
}

export function makeSession(
  overrides: Partial<InternalSession> = {},
): InternalSession {
  return {
    user: makeUser(),
    tokenType: "Bearer",
    accessToken: "access-token-test",
    refreshToken: "refresh-token-test",
    ...overrides,
  };
}

/** Sesión que expira en `offsetMs` respecto a ahora (negativo = ya expirada). */
export function makeSessionExpiringIn(offsetMs: number): InternalSession {
  return makeSession({
    session: { expiresAt: new Date(Date.now() + offsetMs).toISOString() },
  });
}
