import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/shared/auth/auth-context";
import {
  consumeLogoutNotice,
  getStoredInternalSession,
  setStoredInternalSession,
  wasLoggedOutHere,
} from "@/shared/auth/session-storage";
import { makeSession } from "../../../helpers/session-fixtures";

/**
 * ADM-06: cerrar sesión limpia lo local SIEMPRE, reintenta en el servidor, y si el servidor no lo
 * confirma lo dice. Y la pestaña que cerró no vuelve a entrar sola con la cookie que quedó.
 */
const { getInternalMe, logoutInternal } = vi.hoisted(() => ({
  getInternalMe: vi.fn(),
  logoutInternal: vi.fn(),
}));

vi.mock("@/shared/auth/auth-service", () => ({
  loginInternal: vi.fn(),
  verifyLoginPinInternal: vi.fn(),
  getInternalMe,
  logoutInternal,
}));

/** Sin esperas reales entre reintentos. */
vi.mock("@/shared/auth/logout-on-server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/shared/auth/logout-on-server")>();
  return {
    ...actual,
    revokeOnServer: (revoke: () => Promise<unknown>) =>
      actual.revokeOnServer(revoke, [0, 0]),
  };
});

let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return null;
}

function mountAuth() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider · logout (ADM-06)", () => {
  beforeEach(() => {
    logoutInternal.mockResolvedValue({ loggedOut: true });
  });
  afterEach(() => vi.clearAllMocks());

  it("confirmado por el servidor: limpia, marca la pestaña y no deja aviso de fallo", async () => {
    setStoredInternalSession(makeSession());
    mountAuth();
    let resultado: { serverConfirmed: boolean } | undefined;
    await act(async () => {
      resultado = await auth.logout();
    });
    expect(resultado).toEqual({ serverConfirmed: true });
    expect(auth.session).toBeNull();
    expect(getStoredInternalSession()).toBeNull();
    expect(wasLoggedOutHere()).toBe(true);
    expect(consumeLogoutNotice()).toEqual({
      reason: "user",
      serverConfirmed: true,
    });
  });

  it("reintenta y, si el servidor nunca confirma, lo deja dicho para el login", async () => {
    logoutInternal.mockRejectedValue(new Error("backend caído"));
    setStoredInternalSession(makeSession());
    mountAuth();
    let resultado: { serverConfirmed: boolean } | undefined;
    await act(async () => {
      resultado = await auth.logout("idle");
    });
    expect(logoutInternal).toHaveBeenCalledTimes(3);
    expect(resultado).toEqual({ serverConfirmed: false });
    // Lo local se limpió igual.
    expect(auth.session).toBeNull();
    expect(getStoredInternalSession()).toBeNull();
    expect(consumeLogoutNotice()).toEqual({
      reason: "idle",
      serverConfirmed: false,
    });
  });

  it("tras cerrar sesión, la pestaña no se recupera desde la cookie del servidor", async () => {
    setStoredInternalSession(makeSession());
    mountAuth();
    await act(async () => {
      await auth.logout();
    });
    let restaurada: unknown = "sin llamar";
    await act(async () => {
      restaurada = await auth.restoreSessionFromServer();
    });
    expect(restaurada).toBeNull();
    expect(getInternalMe).not.toHaveBeenCalled();
  });

  it("sin la marca, la recuperación desde el servidor sigue funcionando", async () => {
    getInternalMe.mockResolvedValue(makeSession());
    mountAuth();
    await act(async () => {
      await auth.restoreSessionFromServer();
    });
    expect(getInternalMe).toHaveBeenCalledTimes(1);
    expect(auth.session).not.toBeNull();
  });
});
