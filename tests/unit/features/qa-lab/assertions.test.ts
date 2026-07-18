import { describe, expect, it } from "vitest";
import type { EndpointItem } from "@/features/systems/types";
import {
  evaluateEndpointAssertions,
  normalizeExpectedStatuses,
  resolveExpectedStatuses,
} from "@/features/qa-lab/assertions";
import type { QaExpectedResponse } from "@/features/qa-lab/types";

function endpointFixture(overrides: Partial<EndpointItem> = {}): EndpointItem {
  return {
    endpointId: "ep-1",
    code: "USERS_LIST",
    method: "GET",
    routePath: "/internal/users",
    fullPath: "/internal/users",
    expectedStatusCodes: [200],
    ...overrides,
  } as unknown as EndpointItem;
}

function expectedFixture(
  overrides: Partial<QaExpectedResponse> = {},
): QaExpectedResponse {
  return { statusCodes: [200], headers: {}, ...overrides };
}

function inputFixture(overrides: Record<string, unknown> = {}) {
  return {
    endpoint: endpointFixture(),
    httpStatus: 200,
    latencyMs: 10,
    timeoutMs: 5_000,
    responseBody: { ok: true },
    responseHeaders: {} as Record<string, string>,
    responseSizeBytes: 12,
    ...overrides,
  };
}

function itemNamed(
  summary: ReturnType<typeof evaluateEndpointAssertions>,
  name: string,
) {
  const item = summary.items.find((entry) => entry.name === name);
  if (!item) throw new Error(`No existe la aserción "${name}"`);
  return item;
}

describe("normalizeExpectedStatuses", () => {
  it("acepta la lista separada por comas que escribe el operador", () => {
    expect(normalizeExpectedStatuses("200, 404")).toEqual([200, 404]);
  });

  it("acepta una lista mixta de números y cadenas del catálogo", () => {
    expect(normalizeExpectedStatuses([200, "201, 404"])).toEqual([
      200, 201, 404,
    ]);
  });

  it("descarta códigos fuera del rango HTTP en vez de darlos por buenos", () => {
    expect(normalizeExpectedStatuses([99, 600, 204])).toEqual([204]);
  });

  it("descarta valores no enteros", () => {
    expect(normalizeExpectedStatuses("200.5")).toEqual([200]);
  });

  it("deduplica y ordena para que el mensaje sea estable", () => {
    expect(normalizeExpectedStatuses([404, 200, "200,404"])).toEqual([
      200, 404,
    ]);
  });

  /**
   * El peor fallo posible de un motor de aserciones es volverse permisivo ante
   * un spec corrupto. Aquí la única salida segura es exigir 200, nunca "acepta
   * cualquier estado".
   */
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["array vacío", []],
    ["texto sin números", "abc"],
    ["cadena vacía", ""],
    ["cero", 0],
    ["objeto", { a: 1 }],
  ])(
    "cae a [200] con un spec inservible (%s) en vez de aceptar todo",
    (_label, value) => {
      expect(normalizeExpectedStatuses(value)).toEqual([200]);
    },
  );
});

describe("resolveExpectedStatuses", () => {
  it("prefiere los estados declarados en el formulario sobre los del catálogo", () => {
    const statuses = resolveExpectedStatuses({
      endpoint: endpointFixture({ expectedStatusCodes: [200] }),
      expectedResponse: expectedFixture({ statusCodes: [201, 202] }),
    });
    expect(statuses).toEqual([201, 202]);
  });

  it("cae al catálogo cuando el formulario no declara ningún estado", () => {
    const statuses = resolveExpectedStatuses({
      endpoint: endpointFixture({ expectedStatusCodes: "204, 200" }),
      expectedResponse: expectedFixture({ statusCodes: [] }),
    });
    expect(statuses).toEqual([200, 204]);
  });

  it("cae al catálogo cuando no hay formulario", () => {
    const statuses = resolveExpectedStatuses({
      endpoint: endpointFixture({ expectedStatusCodes: [404] }),
    });
    expect(statuses).toEqual([404]);
  });
});

describe("evaluateEndpointAssertions · garantías del resumen", () => {
  it("siempre comprueba al menos estado y latencia, aunque no se pida nada", () => {
    // Un resumen sin aserciones daría `passed: true` trivialmente (0 === 0).
    const summary = evaluateEndpointAssertions(inputFixture());
    expect(summary.total).toBeGreaterThanOrEqual(2);
  });

  it("los contadores cuadran con los items", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        httpStatus: 500,
        expectedResponse: expectedFixture({ bodyContains: "no-esta" }),
      }),
    );
    expect(summary.total).toBe(summary.items.length);
    expect(summary.passedCount).toBe(
      summary.items.filter((item) => item.passed).length,
    );
    expect(summary.failedCount).toBe(summary.total - summary.passedCount);
  });

  it("no da por aprobado el run si alguna aserción falla", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({ httpStatus: 500 }),
    );
    expect(summary.passed).toBe(false);
  });
});

describe("evaluateEndpointAssertions · estado y latencia", () => {
  it("falla cuando el estado no está en el conjunto esperado", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({ httpStatus: 500 }),
    );
    expect(itemNamed(summary, "Estado HTTP esperado")).toMatchObject({
      passed: false,
      actual: "500",
    });
  });

  it("usa el timeout como latencia máxima cuando el formulario no la fija", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({ latencyMs: 6_000, timeoutMs: 5_000 }),
    );
    expect(itemNamed(summary, "Latencia maxima").passed).toBe(false);
  });

  it("la latencia máxima del formulario manda sobre el timeout", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        latencyMs: 900,
        timeoutMs: 5_000,
        expectedResponse: expectedFixture({ maxLatencyMs: 500 }),
      }),
    );
    expect(itemNamed(summary, "Latencia maxima").passed).toBe(false);
  });

  it("una latencia justo en el límite se considera aceptable", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        latencyMs: 500,
        expectedResponse: expectedFixture({ maxLatencyMs: 500 }),
      }),
    );
    expect(itemNamed(summary, "Latencia maxima").passed).toBe(true);
  });
});

describe("evaluateEndpointAssertions · tamaño", () => {
  it("no comprueba el tamaño si no se pidió un máximo", () => {
    const summary = evaluateEndpointAssertions(inputFixture());
    expect(
      summary.items.some((item) => item.name === "Tamano maximo de respuesta"),
    ).toBe(false);
  });

  it("falla cuando la respuesta pesa más de lo pactado", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseSizeBytes: 2_048,
        expectedResponse: expectedFixture({ maxResponseSizeBytes: 1_024 }),
      }),
    );
    expect(itemNamed(summary, "Tamano maximo de respuesta")).toMatchObject({
      passed: false,
      actual: "2048 bytes",
    });
  });
});

describe("evaluateEndpointAssertions · headers", () => {
  it("compara el nombre del header sin distinguir mayúsculas", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseHeaders: { "content-type": "application/json" },
        expectedResponse: expectedFixture({
          headers: { "Content-Type": "application/json" },
        }),
      }),
    );
    expect(itemNamed(summary, "Header Content-Type").passed).toBe(true);
  });

  // El valor sí es sensible a mayúsculas: un header vale por su valor exacto.
  it("compara el valor del header de forma exacta", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseHeaders: { "content-type": "Application/JSON" },
        expectedResponse: expectedFixture({
          headers: { "content-type": "application/json" },
        }),
      }),
    );
    expect(itemNamed(summary, "Header content-type").passed).toBe(false);
  });

  it("un header ausente falla y se reporta como ausente, no como vacío", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseHeaders: {},
        expectedResponse: expectedFixture({ headers: { "x-trace": "abc" } }),
      }),
    );
    expect(itemNamed(summary, "Header x-trace")).toMatchObject({
      passed: false,
      actual: "(ausente)",
    });
  });
});

describe("evaluateEndpointAssertions · contenido del cuerpo", () => {
  it("busca el texto dentro de un cuerpo no-JSON", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: "<html>Bad Gateway</html>",
        expectedResponse: expectedFixture({ bodyContains: "Bad Gateway" }),
      }),
    );
    expect(itemNamed(summary, "Contenido de respuesta").passed).toBe(true);
  });

  it("busca el texto dentro del JSON serializado", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { data: { email: "qa@atlas.internal" } },
        expectedResponse: expectedFixture({
          bodyContains: "qa@atlas.internal",
        }),
      }),
    );
    expect(itemNamed(summary, "Contenido de respuesta").passed).toBe(true);
  });

  it("falla cuando el texto no aparece", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { data: {} },
        expectedResponse: expectedFixture({ bodyContains: "no-esta" }),
      }),
    );
    expect(itemNamed(summary, "Contenido de respuesta").passed).toBe(false);
  });

  /**
   * Regresión: `JSON.stringify(undefined)` devuelve `undefined`, no un string,
   * así que el `.includes()` reventaba con un TypeError y se llevaba por
   * delante el run entero. Una respuesta sin cuerpo no contiene el texto
   * esperado: eso es una aserción FALLIDA, no una excepción.
   */
  it("un cuerpo ausente falla la aserción en vez de reventar el run", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: undefined,
        expectedResponse: expectedFixture({ bodyContains: "algo" }),
      }),
    );
    expect(itemNamed(summary, "Contenido de respuesta").passed).toBe(false);
  });

  it("un cuerpo nulo no satisface un contenido esperado", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: null,
        expectedResponse: expectedFixture({ bodyContains: "algo" }),
      }),
    );
    expect(itemNamed(summary, "Contenido de respuesta").passed).toBe(false);
  });

  it("recorta el cuerpo reportado para no volcar una respuesta enorme", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: "x".repeat(10_000),
        expectedResponse: expectedFixture({ bodyContains: "no-esta" }),
      }),
    );
    expect(
      itemNamed(summary, "Contenido de respuesta").actual.length,
    ).toBeLessThanOrEqual(160);
  });
});

describe("evaluateEndpointAssertions · subconjunto JSON", () => {
  it("no comprueba el JSON si no se pidió", () => {
    const summary = evaluateEndpointAssertions(inputFixture());
    expect(summary.items.some((item) => item.name === "JSON esperado")).toBe(
      false,
    );
  });

  it("acepta un cuerpo con más claves de las esperadas", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { data: { id: 1, extra: "x" }, meta: {} },
        expectedResponse: expectedFixture({ jsonSubset: { data: { id: 1 } } }),
      }),
    );
    expect(itemNamed(summary, "JSON esperado").passed).toBe(true);
  });

  it("falla cuando un valor anidado no coincide", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { data: { id: 2 } },
        expectedResponse: expectedFixture({ jsonSubset: { data: { id: 1 } } }),
      }),
    );
    expect(itemNamed(summary, "JSON esperado").passed).toBe(false);
  });

  it("falla cuando falta una clave esperada", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { data: {} },
        expectedResponse: expectedFixture({ jsonSubset: { data: { id: 1 } } }),
      }),
    );
    expect(itemNamed(summary, "JSON esperado").passed).toBe(false);
  });

  it("no confunde un array con un objeto", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { data: [1, 2] },
        expectedResponse: expectedFixture({ jsonSubset: { data: { 0: 1 } } }),
      }),
    );
    expect(itemNamed(summary, "JSON esperado").passed).toBe(false);
  });

  it("compara los arrays por posición", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { items: [{ id: 1 }, { id: 2 }] },
        expectedResponse: expectedFixture({
          jsonSubset: { items: [{ id: 1 }] },
        }),
      }),
    );
    expect(itemNamed(summary, "JSON esperado").passed).toBe(true);
  });

  it("un cuerpo nulo no satisface un subconjunto con claves", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: null,
        expectedResponse: expectedFixture({ jsonSubset: { data: { id: 1 } } }),
      }),
    );
    expect(itemNamed(summary, "JSON esperado").passed).toBe(false);
  });

  // `null` explícito es una expectativa legítima y distinta de "no pedir nada".
  it("un subconjunto null explícito sí se comprueba", () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { data: 1 },
        expectedResponse: expectedFixture({ jsonSubset: null }),
      }),
    );
    expect(itemNamed(summary, "JSON esperado").passed).toBe(false);
  });

  it('distingue 1 de "1" en vez de comparar con ==', () => {
    const summary = evaluateEndpointAssertions(
      inputFixture({
        responseBody: { id: "1" },
        expectedResponse: expectedFixture({ jsonSubset: { id: 1 } }),
      }),
    );
    expect(itemNamed(summary, "JSON esperado").passed).toBe(false);
  });
});
