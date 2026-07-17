import { act, render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emitSessionChange } from "@/shared/auth/session-events";
import { SessionCacheGuard } from "@/shared/auth/session-cache-guard";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { createTestQueryClient } from "../../../helpers/render-with-providers";
import { makeSession } from "../../../helpers/session-fixtures";

const CHANNEL = "atlas_internal_session";

function mountGuard() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(["usuarios"], [{ email: "pii@example.invalid" }]);

  render(
    <QueryClientProvider client={queryClient}>
      <SessionCacheGuard />
    </QueryClientProvider>,
  );

  return queryClient;
}

function cachedKeys(client: ReturnType<typeof createTestQueryClient>) {
  return client.getQueryCache().getAll().length;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SessionCacheGuard", () => {
  it("purga la cache cuando la sesión termina", () => {
    setStoredInternalSession(makeSession());
    const queryClient = mountGuard();
    expect(cachedKeys(queryClient)).toBe(1);

    act(() => emitSessionChange(null));

    expect(cachedKeys(queryClient)).toBe(0);
  });

  it("no deja PII en la cache tras el logout", () => {
    setStoredInternalSession(makeSession());
    const queryClient = mountGuard();

    act(() => emitSessionChange(null));

    expect(queryClient.getQueryData(["usuarios"])).toBeUndefined();
  });

  it("no purga mientras la sesión sigue viva", () => {
    setStoredInternalSession(makeSession());
    const queryClient = mountGuard();

    act(() => emitSessionChange(makeSession({ accessToken: "otro" })));

    expect(cachedKeys(queryClient)).toBe(1);
  });

  it("no purga en cada emisión de null estando ya deslogueado", () => {
    // Sin sesión previa: apiRequest emite null en cada petición y purgar en
    // todas tiraría la cache constantemente.
    const queryClient = mountGuard();

    act(() => emitSessionChange(null));
    act(() => emitSessionChange(null));

    expect(cachedKeys(queryClient)).toBe(1);
  });

  describe("sincronización entre pestañas", () => {
    it("avisa a las demás pestañas cuando la sesión termina", async () => {
      setStoredInternalSession(makeSession());
      const receiver = new BroadcastChannel(CHANNEL);
      const recibidos: unknown[] = [];
      receiver.onmessage = (event) => recibidos.push(event.data);
      mountGuard();

      act(() => emitSessionChange(null));
      await vi.waitFor(() => expect(recibidos).toHaveLength(1));

      expect(recibidos[0]).toEqual({ type: "SESSION_LOGOUT" });
      receiver.close();
    });

    it("el aviso no lleva tokens ni datos de usuario", async () => {
      setStoredInternalSession(makeSession());
      const receiver = new BroadcastChannel(CHANNEL);
      const recibidos: unknown[] = [];
      receiver.onmessage = (event) => recibidos.push(event.data);
      mountGuard();

      act(() => emitSessionChange(null));
      await vi.waitFor(() => expect(recibidos).toHaveLength(1));

      expect(Object.keys(recibidos[0] as object)).toEqual(["type"]);
      expect(JSON.stringify(recibidos[0])).not.toContain("token");
      receiver.close();
    });

    it("al recibir el aviso de otra pestaña, limpia la sesión local", async () => {
      setStoredInternalSession(makeSession());
      mountGuard();
      const otraPestana = new BroadcastChannel(CHANNEL);

      otraPestana.postMessage({ type: "SESSION_LOGOUT" });

      await vi.waitFor(() =>
        expect(
          window.sessionStorage.getItem("atlas_internal_session_v3"),
        ).toBeNull(),
      );
      otraPestana.close();
    });

    it("no reenvía el aviso recibido (evita el ping-pong entre pestañas)", async () => {
      setStoredInternalSession(makeSession());
      mountGuard();
      const otraPestana = new BroadcastChannel(CHANNEL);
      const rebotes: unknown[] = [];
      otraPestana.onmessage = (event) => rebotes.push(event.data);

      otraPestana.postMessage({ type: "SESSION_LOGOUT" });
      await vi.waitFor(() =>
        expect(
          window.sessionStorage.getItem("atlas_internal_session_v3"),
        ).toBeNull(),
      );

      expect(rebotes).toHaveLength(0);
      otraPestana.close();
    });

    it("ignora mensajes de otro tipo", async () => {
      setStoredInternalSession(makeSession());
      mountGuard();
      const otraPestana = new BroadcastChannel(CHANNEL);

      otraPestana.postMessage({ type: "OTRA_COSA" });
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(
        window.sessionStorage.getItem("atlas_internal_session_v3"),
      ).not.toBeNull();
      otraPestana.close();
    });
  });
});
