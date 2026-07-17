import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InternalSession } from "@/shared/auth/types";

vi.mock("@/shared/api/transport", () => ({
  fetchWithTimeout: vi.fn(),
}));

import { refreshInternalSession } from "@/shared/api/refresh-session";
import { coordinateSessionRefresh } from "@/shared/api/refresh-coordinator";
import { resetRefreshCoordinator } from "@/shared/api/refresh-coordinator";
import { fetchWithTimeout } from "@/shared/api/transport";
import { getStoredInternalSession } from "@/shared/auth/session-storage";

const mockedFetch = vi.mocked(fetchWithTimeout);

/**
 * El backend devuelve permisos/roles en forma "alternativa": objetos con `key`
 * y bajo `effectivePermissions` en vez de `permissions: string[]`. Es
 * exactamente el caso que el refresh guardaba crudo.
 */
function refreshPayloadWithAlternativeShape() {
  return {
    requestId: "req_1",
    data: {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      tokenType: "Bearer",
      user: {
        id: "1",
        tenantId: "demo",
        email: "qa@atlas.internal",
        fullName: "QA Operator",
        status: "ACTIVE",
        roles: [{ key: "INTERNAL_ADMIN" }],
        effectivePermissions: [
          { key: "internal.users.manage" },
          { key: "systems.endpoints.manage" },
        ],
      },
    },
    timestamp: "2026-07-16T12:00:00.000Z",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function existingSession(): InternalSession {
  return {
    accessToken: "old-access-token",
    refreshToken: "old-refresh-token",
    tokenType: "Bearer",
    user: {
      id: "1",
      tenantId: "demo",
      email: "qa@atlas.internal",
      fullName: "QA Operator",
      status: "ACTIVE",
      roles: [],
      permissions: [],
    },
  };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.atlas.internal/api/v1");
  vi.stubEnv("NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE", "session");
  window.sessionStorage.clear();
  resetRefreshCoordinator();
  mockedFetch.mockReset();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe("refreshInternalSession · normalización", () => {
  it("normaliza permisos en forma alternativa a string[]", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(refreshPayloadWithAlternativeShape()),
    );

    const refreshed = await refreshInternalSession(existingSession());

    expect(refreshed?.user.permissions).toEqual([
      "internal.users.manage",
      "systems.endpoints.manage",
    ]);
    expect(refreshed?.user.roles).toEqual(["INTERNAL_ADMIN"]);
  });

  it("la sesión normalizada sobrevive a parseSession en el próximo arranque", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(refreshPayloadWithAlternativeShape()),
    );

    await refreshInternalSession(existingSession());

    // parseSession descarta la sesión si `permissions` no es un array: si el
    // refresh guardara crudo, esto devolvería null y expulsaría al operador.
    const restored = getStoredInternalSession();
    expect(restored).not.toBeNull();
    expect(restored?.user.permissions).toContain("internal.users.manage");
  });

  it("limpia la sesión si el refresh falla", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ error: "nope" }, 401));

    const refreshed = await refreshInternalSession(existingSession());

    expect(refreshed).toBeNull();
    expect(getStoredInternalSession()).toBeNull();
  });
});

describe("coordinateSessionRefresh · single-flight", () => {
  it("N llamadas concurrentes disparan una sola petición", async () => {
    mockedFetch.mockImplementation(
      () =>
        new Promise<Response>((resolve) =>
          setTimeout(
            () => resolve(jsonResponse(refreshPayloadWithAlternativeShape())),
            10,
          ),
        ),
    );

    const session = existingSession();
    const results = await Promise.all([
      coordinateSessionRefresh(session),
      coordinateSessionRefresh(session),
      coordinateSessionRefresh(session),
      coordinateSessionRefresh(session),
    ]);

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    // Todas comparten la misma sesión resultante.
    expect(new Set(results).size).toBe(1);
  });

  it("tras terminar, un 401 posterior puede refrescar de nuevo", async () => {
    // Una Response solo se puede leer una vez: cada llamada necesita la suya.
    mockedFetch.mockImplementation(async () =>
      jsonResponse(refreshPayloadWithAlternativeShape()),
    );

    await coordinateSessionRefresh(existingSession());
    await coordinateSessionRefresh(existingSession());

    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});
