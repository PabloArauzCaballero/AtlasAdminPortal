import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FAKER_UNAVAILABLE_TEXT,
  FakerError,
  fetchFakerBatch,
  fetchFakerCases,
  fetchFakerCatalog,
} from "@/features/qa-lab/fakers/faker-client";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function caught(promise: Promise<unknown>): Promise<FakerError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(FakerError);
  return error as FakerError;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("faker-client · reenvío del mismo origen", () => {
  it("el catálogo se pide al reenvío, no al mock", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { types: [] }));
    await expect(fetchFakerCatalog()).resolves.toEqual({ types: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/qa-fakers/fakers");
    expect(init.headers.accept).toBe("application/json");
  });

  it("un lote manda semilla, cantidad, variante y parámetros (vacíos si no hay)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));
    await fetchFakerBatch("caso con espacio", {
      seed: "qa-base",
      count: 3,
      variant: "frontera",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/qa-fakers/fakers/caso%20con%20espacio");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      seed: "qa-base",
      count: 3,
      variant: "frontera",
      params: {},
    });
  });

  it("sin red, el error dice que el generador no responde", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await caught(fetchFakerCatalog());
    expect(error.code).toBe("QA_FAKERS_UNAVAILABLE");
    expect(error.status).toBe(0);
    expect(error.message).toBe(FAKER_UNAVAILABLE_TEXT);
  });

  it("un 5xx sin cuerpo JSON también se lee como «no responde»", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502</html>", { status: 502 }),
    );
    const error = await caught(fetchFakerCatalog());
    expect(error.code).toBe("QA_FAKERS_ERROR");
    expect(error.status).toBe(502);
    expect(error.message).toBe(FAKER_UNAVAILABLE_TEXT);
    expect(error.details).toEqual([]);
  });

  it("un 400 conserva el código, el detalle y los parámetros rechazados", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: "QA_FAKERS_INVALID_PARAMS",
        detail: "La edad mínima no puede superar a la máxima.",
        errors: [{ param: "edadMin", detail: "Debe ser ≤ edadMax." }],
      }),
    );
    const error = await caught(
      fetchFakerBatch("caso", { seed: "s", count: 1, variant: "valido" }),
    );
    expect(error.code).toBe("QA_FAKERS_INVALID_PARAMS");
    expect(error.status).toBe(400);
    expect(error.message).toBe("La edad mínima no puede superar a la máxima.");
    expect(error.details).toEqual([
      { param: "edadMin", detail: "Debe ser ≤ edadMax." },
    ]);
  });

  it("un 4xx sin detalle da un mensaje genérico", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, {}));
    const error = await caught(fetchFakerCatalog());
    expect(error.message).toBe(
      "El generador de datos de prueba rechazó la petición.",
    );
  });

  it("QA_FAKERS_UNAVAILABLE del reenvío se muestra como «no responde» aunque sea 4xx", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(424, { error: "QA_FAKERS_UNAVAILABLE", detail: "x" }),
    );
    const error = await caught(fetchFakerCatalog());
    expect(error.message).toBe(FAKER_UNAVAILABLE_TEXT);
  });
});

describe("fetchFakerCases · caso y monto unidos por posición", () => {
  function respondByType() {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const type = url.split("/").pop();
      return jsonResponse(200, {
        items: Array.from({ length: body.count }, (_, index) => ({
          type,
          index,
          variant: body.variant,
          params: body.params,
        })),
      });
    });
  }

  function requestFor(type: string) {
    const call = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith(`/${type}`),
    );
    return JSON.parse(String(call?.[1].body));
  }

  it("pide los dos tipos con la misma semilla y los une elemento a elemento", async () => {
    respondByType();
    const cases = await fetchFakerCases({
      seed: "qa-base",
      count: 2,
      variant: "valido",
      params: { caso: { edadMin: 30 }, monto: { maximo: 500 } },
    });
    expect(cases).toHaveLength(2);
    expect(cases[1].caso).toMatchObject({ type: "caso", index: 1 });
    expect(cases[1].monto).toMatchObject({ type: "monto", index: 1 });
    expect(requestFor("caso")).toMatchObject({
      seed: "qa-base",
      params: { edadMin: 30 },
    });
    expect(requestFor("monto")).toMatchObject({
      seed: "qa-base",
      params: { maximo: 500 },
    });
  });

  it("en la variante inválida el monto se pide válido: la regla rota la lleva el caso", async () => {
    respondByType();
    await fetchFakerCases({ seed: "s", count: 1, variant: "invalido" });
    expect(requestFor("caso").variant).toBe("invalido");
    expect(requestFor("monto").variant).toBe("valido");
    expect(requestFor("monto").params).toEqual({});
  });

  it("la frontera se pide igual a los dos", async () => {
    respondByType();
    await fetchFakerCases({ seed: "s", count: 1, variant: "frontera" });
    expect(requestFor("caso").variant).toBe("frontera");
    expect(requestFor("monto").variant).toBe("frontera");
  });
});
