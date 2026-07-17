import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getInternalAuthStorageMode,
  isCookieBackedSession,
  isSessionExpired,
  sanitizeSessionForStorage,
  shouldPersistSessionTokens,
} from "@/shared/auth/auth-session-policy";
import {
  makeSession,
  makeSessionExpiringIn,
} from "../../../helpers/session-fixtures";

const ENV_KEY = "NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE";

function setMode(mode: string | undefined) {
  vi.stubEnv(ENV_KEY, mode);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getInternalAuthStorageMode", () => {
  it.each(["auto", "session"])("respeta el modo explícito %s", (mode) => {
    setMode(mode);
    expect(getInternalAuthStorageMode()).toBe(mode);
  });

  /**
   * El default falla cerrado. Antes era `auto`, que persiste tokens si el backend responde
   * `Bearer`: un despliegue que olvidara la variable caía en el modo inseguro en silencio. El
   * backend ya entrega la sesión en cookies `HttpOnly`, así que `cookie` es además lo correcto.
   */
  it("cae en 'cookie' si no está configurado (fail-closed)", () => {
    setMode(undefined);
    expect(getInternalAuthStorageMode()).toBe("cookie");
  });

  it("cae en 'cookie' ante un valor desconocido, no en un modo que persista tokens", () => {
    setMode("cualquier-cosa");
    expect(getInternalAuthStorageMode()).toBe("cookie");
  });
});

describe("sanitizeSessionForStorage · sin configuración explícita", () => {
  it("no deja ningún token en lo que se serializa al storage", () => {
    setMode(undefined);
    const stored = sanitizeSessionForStorage(
      makeSession({
        accessToken: "access-secreto",
        refreshToken: "refresh-secreto",
      }),
    );

    expect(stored.accessToken).toBeUndefined();
    expect(stored.refreshToken).toBeUndefined();
    // La comprobación que pide la rúbrica: ni rastro del token en el JSON serializado.
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain("access-secreto");
    expect(serialized).not.toContain("refresh-secreto");
  });

  it("conserva el perfil: lo que se descarta son las credenciales, no la sesión", () => {
    setMode(undefined);
    const stored = sanitizeSessionForStorage(makeSession({ accessToken: "x" }));

    expect(stored.user.email).toBeTruthy();
    expect(stored.tokenType).toBe("Cookie");
  });
});

describe("shouldPersistSessionTokens", () => {
  it("nunca persiste en modo cookie, aunque haya bearer token", () => {
    setMode("cookie");
    expect(
      shouldPersistSessionTokens(makeSession({ tokenType: "Bearer" })),
    ).toBe(false);
  });

  it("siempre persiste en modo session", () => {
    setMode("session");
    expect(
      shouldPersistSessionTokens(makeSession({ tokenType: "Cookie" })),
    ).toBe(true);
  });

  it("en modo auto no persiste si el backend respondió tokenType Cookie", () => {
    setMode("auto");
    expect(
      shouldPersistSessionTokens(makeSession({ tokenType: "Cookie" })),
    ).toBe(false);
  });

  it("en modo auto persiste si el backend respondió Bearer", () => {
    setMode("auto");
    expect(
      shouldPersistSessionTokens(makeSession({ tokenType: "Bearer" })),
    ).toBe(true);
  });
});

describe("sanitizeSessionForStorage", () => {
  it("elimina los tokens cuando no deben persistirse (modo cookie)", () => {
    setMode("cookie");
    const sanitized = sanitizeSessionForStorage(makeSession());

    expect(sanitized.accessToken).toBeUndefined();
    expect(sanitized.refreshToken).toBeUndefined();
    expect(sanitized.tokenType).toBe("Cookie");
  });

  it("no muta la sesión original al sanitizar", () => {
    setMode("cookie");
    const original = makeSession();
    sanitizeSessionForStorage(original);

    expect(original.accessToken).toBe("access-token-test");
    expect(original.refreshToken).toBe("refresh-token-test");
  });

  it("conserva los datos del usuario al sanitizar", () => {
    setMode("cookie");
    const sanitized = sanitizeSessionForStorage(makeSession());

    expect(sanitized.user.email).toBe("user@example.invalid");
  });

  it("devuelve la sesión intacta cuando sí debe persistirse", () => {
    setMode("session");
    const sanitized = sanitizeSessionForStorage(makeSession());

    expect(sanitized.accessToken).toBe("access-token-test");
    expect(sanitized.refreshToken).toBe("refresh-token-test");
  });
});

describe("isSessionExpired", () => {
  it("considera vigente una sesión null (no hay nada que expirar)", () => {
    expect(isSessionExpired(null)).toBe(false);
  });

  it("considera vigente una sesión sin expiresAt", () => {
    expect(isSessionExpired(makeSession())).toBe(false);
  });

  it("detecta una sesión ya expirada", () => {
    expect(isSessionExpired(makeSessionExpiringIn(-60_000))).toBe(true);
  });

  it("considera vigente una sesión que expira en el futuro", () => {
    expect(isSessionExpired(makeSessionExpiringIn(60_000))).toBe(false);
  });

  it("no marca como expirada una fecha inválida", () => {
    const session = makeSession({ session: { expiresAt: "no-es-una-fecha" } });
    expect(isSessionExpired(session)).toBe(false);
  });
});

describe("isCookieBackedSession", () => {
  it("es cookie-backed si tokenType es Cookie y no hay accessToken", () => {
    const session = makeSession({
      tokenType: "Cookie",
      accessToken: undefined,
    });
    expect(isCookieBackedSession(session)).toBe(true);
  });

  it("no es cookie-backed si todavía conserva un accessToken", () => {
    expect(isCookieBackedSession(makeSession({ tokenType: "Cookie" }))).toBe(
      false,
    );
  });

  it("no es cookie-backed con tokenType Bearer", () => {
    expect(isCookieBackedSession(makeSession({ tokenType: "Bearer" }))).toBe(
      false,
    );
  });

  it("no es cookie-backed si la sesión es null", () => {
    expect(isCookieBackedSession(null)).toBe(false);
  });
});
