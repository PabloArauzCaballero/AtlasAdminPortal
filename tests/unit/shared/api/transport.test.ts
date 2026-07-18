import { afterEach, describe, expect, it, vi } from "vitest";
import { isAtlasApiError } from "@/shared/api/errors";
import { fetchWithTimeout, rawFetch } from "@/shared/api/transport";

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

  it("una señal upstream ya abortada se propaga como cancelación, no como timeout", async () => {
    // Antes esto reportaba REQUEST_TIMEOUT: una petición que nadie dejó empezar
    // decía "tardó demasiado". Ahora conserva la semántica de cancelación.
    vi.stubGlobal("fetch", fetchThatHangs());
    const controller = new AbortController();
    controller.abort();

    const error = await fetchWithTimeout("https://api.test/x", {
      signal: controller.signal,
    }).catch((e: unknown) => e);

    expect(isAtlasApiError(error)).toBe(false);
    expect((error as DOMException).name).toBe("AbortError");
  });

  /**
   * Corrección del hallazgo 1 de `docs/audits/baseline-2026-07-15.md`.
   *
   * Cancelar desde arriba (el usuario, o TanStack Query al desmontar) ya NO se
   * reporta como REQUEST_TIMEOUT: se re-lanza el abort original para que Query
   * lo trate como cancelación y no como error. Solo el timeout interno produce
   * REQUEST_TIMEOUT (lo cubre el test de más arriba).
   */
  it("cancelar desde upstream re-lanza el abort, no un REQUEST_TIMEOUT", async () => {
    vi.stubGlobal("fetch", fetchThatHangs());
    const controller = new AbortController();

    const pending = fetchWithTimeout("https://api.test/x", {
      signal: controller.signal,
    }).catch((e: unknown) => e);
    controller.abort();
    const error = await pending;

    expect(isAtlasApiError(error)).toBe(false);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("preserva el motivo de cancelación cuando la señal upstream trae uno", async () => {
    // Query aborta con un motivo propio; propagarlo (y no un timeout inventado)
    // deja que el llamador distinga por qué se canceló.
    vi.stubGlobal("fetch", fetchThatHangs());
    const controller = new AbortController();
    const reason = new DOMException("cancelado por el usuario", "AbortError");

    const pending = fetchWithTimeout("https://api.test/x", {
      signal: controller.signal,
    }).catch((e: unknown) => e);
    controller.abort(reason);
    const error = await pending;

    expect(error).toBe(reason);
  });

  it("un timeout real sigue siendo REQUEST_TIMEOUT aunque haya señal upstream", async () => {
    // El fix no debe tragarse el timeout genuino: si vence el timer interno y la
    // señal de arriba nunca abortó, es un timeout de verdad.
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "1000");
    vi.stubGlobal("fetch", fetchThatHangs());
    const controller = new AbortController();

    const pending = fetchWithTimeout("https://api.test/lenta", {
      signal: controller.signal,
    }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1_000);
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

/**
 * `rawFetch` es el transporte del QA Lab: a diferencia de `fetchWithTimeout`
 * NO traduce los errores a `AtlasApiError` y recibe el timeout por parámetro en
 * vez de leerlo de la configuración. El QA Lab necesita ver el fallo crudo tal
 * como lo vería un cliente del backend.
 */
describe("rawFetch", () => {
  it("devuelve la respuesta cuando el backend responde a tiempo", async () => {
    const ok = new Response('{"ok":true}', { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok));

    await expect(rawFetch("https://api.test/x", {}, 5_000)).resolves.toBe(ok);
  });

  it("propaga la respuesta aunque el status sea de error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 })),
    );

    const response = await rawFetch("https://api.test/x", {}, 5_000);

    expect(response.status).toBe(500);
  });

  it("propaga el error de red crudo, sin envolverlo en AtlasApiError", async () => {
    // Es la diferencia deliberada con `fetchWithTimeout`: el QA Lab muestra el
    // fallo real. Si alguien añadiera aquí el mapeo, el laboratorio empezaría a
    // mentir sobre qué falló.
    const networkError = new TypeError("failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    const error = await rawFetch("https://api.test/x", {}, 5_000).catch(
      (e: unknown) => e,
    );

    expect(error).toBe(networkError);
    expect(isAtlasApiError(error)).toBe(false);
  });

  it("usa el timeout recibido por parámetro y no el de la configuración", async () => {
    // El QA Lab configura su propio timeout por perfil: leer el global haría que
    // una prueba de latencia abortara cuando no debe.
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "60000");
    vi.stubGlobal("fetch", fetchThatHangs());

    const pending = rawFetch("https://api.test/lenta", {}, 1_000).catch(
      (e: unknown) => e,
    );
    await vi.advanceTimersByTimeAsync(1_000);
    const error = await pending;

    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("no aborta antes de que venza su propio timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchThatHangs());

    let settled = false;
    void rawFetch("https://api.test/lenta", {}, 5_000).catch(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(4_000);

    expect(settled).toBe(false);
  });

  it("respeta una señal upstream ya abortada antes de empezar", async () => {
    vi.stubGlobal("fetch", fetchThatHangs());
    const controller = new AbortController();
    controller.abort();

    const error = await rawFetch(
      "https://api.test/x",
      {
        signal: controller.signal,
      },
      5_000,
    ).catch((e: unknown) => e);

    expect((error as DOMException).name).toBe("AbortError");
  });

  it("cancela la petición cuando la señal upstream aborta después", async () => {
    vi.stubGlobal("fetch", fetchThatHangs());
    const controller = new AbortController();

    const pending = rawFetch(
      "https://api.test/x",
      {
        signal: controller.signal,
      },
      5_000,
    ).catch((e: unknown) => e);
    controller.abort();
    const error = await pending;

    expect((error as DOMException).name).toBe("AbortError");
  });

  it("limpia el timer al responder, para no abortar una petición ya terminada", async () => {
    // Sin el `clearTimeout` del finally, el timer seguiría vivo y abortaría un
    // controller ya inútil, además de retener memoria por cada request.
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("")));

    await rawFetch("https://api.test/x", {}, 5_000);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("pasa su propia señal y conserva el resto del init", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(""));
    vi.stubGlobal("fetch", fetchSpy);

    await rawFetch("https://api.test/x", { method: "PUT", body: "{}" }, 5_000);

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.method).toBe("PUT");
    expect(init.body).toBe("{}");
  });
});
