import { afterEach, describe, expect, it, vi } from "vitest";
import { isAtlasApiError } from "@/shared/api/errors";
import { fetchWithTimeout } from "@/shared/api/transport";

/**
 * Stub de fetch que nunca resuelve por su cuenta: solo rechaza cuando la señal
 * aborta, igual que hace el fetch real. Permite testear el timeout de forma
 * determinista con timers falsos, sin esperas reales.
 */
function fetchThatHangs() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const abort = () =>
        reject(new DOMException("The operation was aborted.", "AbortError"));

      // El fetch real rechaza de inmediato si la señal ya venía abortada;
      // esperar el evento en ese caso no dispararía nunca.
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort, { once: true });
    });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("fetchWithTimeout", () => {
  it("devuelve la respuesta cuando el backend responde a tiempo", async () => {
    const ok = new Response('{"ok":true}', { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok));

    await expect(fetchWithTimeout("https://api.test/x", {})).resolves.toBe(ok);
  });

  it("propaga la respuesta aunque el status sea de error (no lanza por 4xx/5xx)", async () => {
    const forbidden = new Response("", { status: 403 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(forbidden));

    const response = await fetchWithTimeout("https://api.test/x", {});
    expect(response.status).toBe(403);
  });

  it("convierte un fallo de red en AtlasApiError NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));

    const error = await fetchWithTimeout("https://api.test/x", {}).catch(
      (e: unknown) => e,
    );

    expect(isAtlasApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("aborta y devuelve REQUEST_TIMEOUT al superar el timeout configurado", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "1000");
    vi.stubGlobal("fetch", fetchThatHangs());

    const pending = fetchWithTimeout("https://api.test/lenta", {}).catch(
      (e: unknown) => e,
    );
    await vi.advanceTimersByTimeAsync(1_000);
    const error = await pending;

    expect(isAtlasApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 0, code: "REQUEST_TIMEOUT" });
  });

  it("no aborta antes de que venza el timeout", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "5000");
    const fetchSpy = fetchThatHangs();
    vi.stubGlobal("fetch", fetchSpy);

    let settled = false;
    void fetchWithTimeout("https://api.test/lenta", {}).catch(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(4_000);

    expect(settled).toBe(false);
  });

  it("respeta una señal upstream ya abortada antes de empezar", async () => {
    vi.stubGlobal("fetch", fetchThatHangs());
    const controller = new AbortController();
    controller.abort();

    const error = await fetchWithTimeout("https://api.test/x", {
      signal: controller.signal,
    }).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 0, code: "REQUEST_TIMEOUT" });
  });

  it("cancela la petición cuando la señal upstream aborta después (TanStack Query)", async () => {
    vi.stubGlobal("fetch", fetchThatHangs());
    const controller = new AbortController();

    const pending = fetchWithTimeout("https://api.test/x", {
      signal: controller.signal,
    }).catch((e: unknown) => e);
    controller.abort();
    const error = await pending;

    expect(isAtlasApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 0, code: "REQUEST_TIMEOUT" });
  });

  it("pasa su propia señal al fetch subyacente", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(""));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchWithTimeout("https://api.test/x", { method: "POST" });

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.method).toBe("POST");
  });
});
