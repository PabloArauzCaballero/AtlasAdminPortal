import { describe, expect, it, vi } from "vitest";
import {
  proxyFakerRequest,
  resolveFakerTarget,
} from "@/features/qa-lab/fakers/faker-proxy";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("resolveFakerTarget · sólo tres formas permitidas", () => {
  it("el catálogo y los lotes por tipo", () => {
    expect(resolveFakerTarget("GET", ["fakers"])).toBe("/mock/fakers");
    expect(resolveFakerTarget("GET", ["fakers", "persona"])).toBe(
      "/mock/fakers/persona",
    );
    expect(resolveFakerTarget("POST", ["fakers", "caso"])).toBe(
      "/mock/fakers/caso",
    );
  });

  it("nada más: ni otras rutas del mock, ni otros verbos, ni tipos raros", () => {
    expect(resolveFakerTarget("POST", ["fakers"])).toBeNull();
    expect(resolveFakerTarget("DELETE", ["fakers", "caso"])).toBeNull();
    expect(resolveFakerTarget("GET", ["providers"])).toBeNull();
    expect(
      resolveFakerTarget("GET", ["segip", "identity", "verify"]),
    ).toBeNull();
    expect(resolveFakerTarget("GET", ["fakers", "caso", "extra"])).toBeNull();
    expect(resolveFakerTarget("GET", ["fakers", "..%2Fadmin"])).toBeNull();
    expect(resolveFakerTarget("GET", ["fakers", "a/b"])).toBeNull();
    expect(resolveFakerTarget("GET", [])).toBeNull();
  });
});

describe("proxyFakerRequest", () => {
  it("una ruta no permitida responde 404 sin tocar la red", async () => {
    const fetchImpl = vi.fn();
    const result = await proxyFakerRequest(
      { method: "GET", segments: ["providers"] },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: "QA_FAKERS_ROUTE_NOT_ALLOWED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reenvía el POST al origen configurado con el cuerpo tal cual", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [1] }));
    const result = await proxyFakerRequest(
      { method: "POST", segments: ["fakers", "caso"], body: '{"seed":"x"}' },
      {
        origin: "http://mock:4010/",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result).toEqual({ status: 200, body: { items: [1] } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://mock:4010/mock/fakers/caso");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"seed":"x"}');
  });

  it("en GET conserva la consulta; en POST la descarta", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));
    await proxyFakerRequest(
      {
        method: "GET",
        segments: ["fakers", "persona"],
        search: "?seed=a&count=2",
      },
      {
        origin: "http://mock:4010",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe(
      "http://mock:4010/mock/fakers/persona?seed=a&count=2",
    );
  });

  it("propaga el 422 del mock con sus errores por parámetro", async () => {
    const body = {
      error: "INVALID_FAKER_PARAMS",
      errors: [{ param: "count", detail: "x" }],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(body, 422));
    const result = await proxyFakerRequest(
      { method: "POST", segments: ["fakers", "persona"], body: "{}" },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(result).toEqual({ status: 422, body });
  });

  it("si el mock no responde a tiempo: 503 QA_FAKERS_UNAVAILABLE con mensaje en español", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const result = await proxyFakerRequest(
      { method: "GET", segments: ["fakers"] },
      { timeoutMs: 20, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ error: "QA_FAKERS_UNAVAILABLE" });
    expect(JSON.stringify(result.body)).toContain("no responde");
  });

  it("si la conexión se rechaza: también 503", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const result = await proxyFakerRequest(
      { method: "GET", segments: ["fakers"] },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(result.status).toBe(503);
  });

  it("un cuerpo demasiado grande se rechaza sin reenviarlo", async () => {
    const fetchImpl = vi.fn();
    const result = await proxyFakerRequest(
      {
        method: "POST",
        segments: ["fakers", "caso"],
        body: "x".repeat(20_000),
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(result.status).toBe(413);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
