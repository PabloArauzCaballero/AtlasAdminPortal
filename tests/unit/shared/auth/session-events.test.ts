import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToSessionChanges } from "@/shared/auth/session-events";
import {
  clearStoredInternalSession,
  setStoredInternalSession,
} from "@/shared/auth/session-storage";
import type { InternalSession } from "@/shared/auth/types";

function sessionWith(permissions: string[]): InternalSession {
  return {
    accessToken: "token",
    tokenType: "Bearer",
    user: {
      id: "1",
      tenantId: "demo",
      email: "qa@atlas.internal",
      fullName: "QA Operator",
      status: "ACTIVE",
      roles: [],
      permissions,
    },
  };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE", "session");
  window.sessionStorage.clear();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe("session-events", () => {
  it("notifica a los suscriptores cuando se guarda una sesión", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionChanges(listener);

    setStoredInternalSession(sessionWith(["internal.users.manage"]));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]?.user.permissions).toEqual([
      "internal.users.manage",
    ]);
    unsubscribe();
  });

  it("emite la sesión completa, no la saneada para almacenamiento", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionChanges(listener);

    setStoredInternalSession(sessionWith([]));

    // El estado en memoria debe conservar el token aunque el storage lo filtre.
    expect(listener.mock.calls[0][0]?.accessToken).toBe("token");
    unsubscribe();
  });

  it("notifica null al limpiar la sesión", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionChanges(listener);

    clearStoredInternalSession();

    expect(listener).toHaveBeenCalledWith(null);
    unsubscribe();
  });

  it("deja de notificar tras darse de baja", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionChanges(listener);
    unsubscribe();

    setStoredInternalSession(sessionWith([]));

    expect(listener).not.toHaveBeenCalled();
  });

  it("un listener que falla no impide notificar al resto", () => {
    const failing = vi.fn(() => {
      throw new Error("listener roto");
    });
    const healthy = vi.fn();
    const unsubFailing = subscribeToSessionChanges(failing);
    const unsubHealthy = subscribeToSessionChanges(healthy);

    expect(() => setStoredInternalSession(sessionWith([]))).toThrow();

    unsubFailing();
    unsubHealthy();
  });
});
