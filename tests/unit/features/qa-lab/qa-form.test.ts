import { describe, expect, it } from "vitest";
import {
  expectedStatusesText,
  parseEndpointRunForm,
  parseEndpointStressForm,
  type CommonFormInput,
} from "@/features/qa-lab/qa-form";

function commonForm(overrides: Partial<CommonFormInput> = {}): CommonFormInput {
  return {
    payload: "",
    queryParams: "",
    pathParams: "",
    headers: "",
    environment: "LOCAL",
    baseRouteKey: "PORTAL_API",
    customHostUrl: "",
    routeOverride: "",
    expectedStatusCodes: "200",
    expectedHeaders: "",
    expectedJsonSubset: "",
    expectedBodyContains: "",
    maxLatencyMs: 0,
    maxResponseSizeBytes: 0,
    authMode: "session",
    includeTenantHeader: true,
    includeIdempotencyKey: false,
    ...overrides,
  };
}

function runForm(overrides: Record<string, unknown> = {}) {
  return {
    ...commonForm(overrides as Partial<CommonFormInput>),
    dryRun: true,
    timeoutMs: 5_000,
    allowMutations: false,
    ...overrides,
  } as Parameters<typeof parseEndpointRunForm>[0];
}

function stressForm(overrides: Record<string, unknown> = {}) {
  return {
    ...runForm(overrides),
    targetRps: 10,
    durationSeconds: 5,
    concurrency: 2,
    rampUpSeconds: 0,
    maxRequests: 100,
    maxErrorRatePercent: -1,
    minThroughputRps: 0,
    maxAvgMs: 0,
    maxP95Ms: 0,
    maxP99Ms: 0,
    approvalTicket: "",
    ...overrides,
  } as Parameters<typeof parseEndpointStressForm>[0];
}

function unwrapRun(overrides: Record<string, unknown> = {}) {
  const result = parseEndpointRunForm(runForm(overrides));
  if (!result.ok) throw new Error(`Se esperaba ok, llegó: ${result.error}`);
  return result.value;
}

function unwrapStress(overrides: Record<string, unknown> = {}) {
  const result = parseEndpointStressForm(stressForm(overrides));
  if (!result.ok) throw new Error(`Se esperaba ok, llegó: ${result.error}`);
  return result.value;
}

function errorOfRun(overrides: Record<string, unknown> = {}): string {
  const result = parseEndpointRunForm(runForm(overrides));
  if (result.ok) throw new Error("Se esperaba un error de validación");
  return result.error;
}

describe("parseEndpointRunForm · bloques JSON", () => {
  it("un formulario en blanco produce objetos vacíos, no errores", () => {
    const value = unwrapRun();
    expect(value.payload).toEqual({});
    expect(value.queryParams).toEqual({});
    expect(value.pathParams).toEqual({});
    expect(value.headers).toEqual({});
  });

  it("parsea los bloques que el operador sí rellenó", () => {
    const value = unwrapRun({
      payload: '{"channel":"mobile_app"}',
      queryParams: '{"limit":10}',
    });
    expect(value.payload).toEqual({ channel: "mobile_app" });
    expect(value.queryParams).toEqual({ limit: 10 });
  });

  it.each([
    ["payload", "Payload"],
    ["queryParams", "Query params"],
    ["pathParams", "Path params"],
    ["headers", "Headers"],
  ])("nombra el bloque %s cuando su JSON está roto", (field, label) => {
    expect(errorOfRun({ [field]: "{ roto" })).toContain(label);
  });

  it("rechaza un bloque que no es objeto", () => {
    expect(errorOfRun({ payload: "[1,2]" })).toBe(
      "Payload debe ser un objeto JSON.",
    );
  });

  /**
   * Las cabeceras acaban en un fetch real: un valor numérico debe viajar como
   * texto, no como number.
   */
  it("estringifica los valores de las cabeceras", () => {
    const value = unwrapRun({ headers: '{"X-Retry":3}' });
    expect(value.headers).toEqual({ "X-Retry": "3" });
  });
});

describe("parseEndpointRunForm · timeout", () => {
  it.each([
    ["por debajo del mínimo", 10, 1_000],
    ["por encima del máximo", 999_999, 120_000],
    ["dentro de rango", 5_000, 5_000],
  ])("acota el timeout %s", (_label, input, expected) => {
    expect(unwrapRun({ timeoutMs: input }).timeoutMs).toBe(expected);
  });

  /**
   * Un timeout NaN acaba en `AbortSignal.timeout(NaN)` y en la aserción de
   * latencia: cualquier comparación con NaN es false, así que la aserción
   * fallaría siempre sin explicar por qué.
   */
  it("un timeout NaN cae al mínimo en vez de viajar como NaN", () => {
    expect(unwrapRun({ timeoutMs: Number.NaN }).timeoutMs).toBe(1_000);
  });
});

describe("parseEndpointRunForm · host manual", () => {
  it("exige un host cuando la base es CUSTOM_HOST", () => {
    expect(
      errorOfRun({ baseRouteKey: "CUSTOM_HOST", customHostUrl: "  " }),
    ).toBe("Host URL es requerido.");
  });

  it("rechaza un host que no parsea como URL", () => {
    expect(
      errorOfRun({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: "no-es-una-url",
      }),
    ).toBe("Host URL no es valido.");
  });

  it.each(["javascript:alert(1)", "file:///etc/passwd", "ftp://host/x"])(
    "rechaza el esquema no http(s) %s",
    (url) => {
      expect(
        errorOfRun({ baseRouteKey: "CUSTOM_HOST", customHostUrl: url }),
      ).toBe("Host URL debe usar http o https.");
    },
  );

  it("acepta un host https válido", () => {
    const value = unwrapRun({
      baseRouteKey: "CUSTOM_HOST",
      customHostUrl: "https://qa-sandbox.atlas.internal",
    });
    expect(value.customHostUrl).toBe("https://qa-sandbox.atlas.internal");
  });

  /**
   * Comportamiento fijado: con otra base, el host manual no se valida porque no
   * se usa. La allowlist de `qa-safety` es la que decide si se puede llamar; el
   * formulario sólo comprueba lo que va a usar.
   */
  it("no valida el host manual si la base no es CUSTOM_HOST (fijado)", () => {
    expect(unwrapRun({ customHostUrl: "no-es-una-url" }).customHostUrl).toBe(
      "no-es-una-url",
    );
  });
});

describe("parseEndpointRunForm · normalización a undefined", () => {
  it.each([
    ["routeOverride", "routeOverride"],
    ["customHostUrl", "customHostUrl"],
    ["customAuthToken", "customAuthToken"],
  ])("un %s en blanco se normaliza a undefined", (field) => {
    const value = unwrapRun({ [field]: "   " }) as unknown as Record<
      string,
      unknown
    >;
    expect(value[field]).toBeUndefined();
  });

  it("recorta los espacios de los campos de texto", () => {
    expect(unwrapRun({ routeOverride: "  /health  " }).routeOverride).toBe(
      "/health",
    );
  });

  it("un bodyContains en blanco no genera una expectativa de contenido", () => {
    expect(
      unwrapRun({ expectedBodyContains: "   " }).expectedResponse.bodyContains,
    ).toBeUndefined();
  });
});

describe("parseEndpointRunForm · respuesta esperada", () => {
  it.each([
    ["lista con espacios", "200, 404", [200, 404]],
    ["desordenada y con duplicados", "404,200,200", [200, 404]],
    ["vacía", "", [200]],
    ["sin números", "abc", [200]],
    ["fuera de rango HTTP", "99,600", [200]],
    ["mixta", "204, 999", [204]],
  ])("interpreta los estados esperados (%s)", (_label, text, expected) => {
    expect(
      unwrapRun({ expectedStatusCodes: text }).expectedResponse.statusCodes,
    ).toEqual(expected);
  });

  /**
   * `positiveOrUndefined` es lo que evita que un campo numérico vacío (que la
   * UI manda como 0) se convierta en "latencia máxima 0 ms", lo que haría
   * fallar la aserción de latencia en TODOS los runs.
   */
  it("una latencia máxima en 0 se ignora en vez de fijar un límite imposible", () => {
    expect(
      unwrapRun({ maxLatencyMs: 0 }).expectedResponse.maxLatencyMs,
    ).toBeUndefined();
  });

  it("un tamaño máximo en 0 se ignora", () => {
    expect(
      unwrapRun({ maxResponseSizeBytes: 0 }).expectedResponse
        .maxResponseSizeBytes,
    ).toBeUndefined();
  });

  it("conserva los límites positivos", () => {
    const value = unwrapRun({ maxLatencyMs: 500, maxResponseSizeBytes: 2_048 });
    expect(value.expectedResponse).toMatchObject({
      maxLatencyMs: 500,
      maxResponseSizeBytes: 2_048,
    });
  });

  /**
   * `assertions.ts` sólo salta la comprobación de JSON cuando el subset es
   * `undefined`, así que el textarea vacío TIENE que dar undefined y no null.
   */
  it("un JSON esperado en blanco no añade una aserción que nadie pidió", () => {
    expect(unwrapRun().expectedResponse.jsonSubset).toBeUndefined();
  });

  it("un JSON esperado null explícito sí se conserva", () => {
    expect(
      unwrapRun({ expectedJsonSubset: "null" }).expectedResponse.jsonSubset,
    ).toBeNull();
  });

  it("acepta un subset que es array", () => {
    expect(
      unwrapRun({ expectedJsonSubset: "[1,2]" }).expectedResponse.jsonSubset,
    ).toEqual([1, 2]);
  });

  it("reporta un JSON esperado malformado", () => {
    expect(errorOfRun({ expectedJsonSubset: "{ roto" })).toContain(
      "JSON esperado",
    );
  });

  it("reporta cabeceras esperadas malformadas", () => {
    expect(errorOfRun({ expectedHeaders: "{ roto" })).toContain(
      "Headers esperados",
    );
  });

  it("estringifica los valores de las cabeceras esperadas", () => {
    expect(
      unwrapRun({ expectedHeaders: '{"X-Total":5}' }).expectedResponse.headers,
    ).toEqual({ "X-Total": "5" });
  });
});

describe("parseEndpointStressForm", () => {
  it.each([
    ["targetRps", "targetRps", 0, 1],
    ["targetRps", "targetRps", 10_000, 500],
    ["durationSeconds", "durationSeconds", 0, 1],
    ["durationSeconds", "durationSeconds", 99_999, 3_600],
    ["concurrency", "concurrency", 0, 1],
    ["concurrency", "concurrency", 5_000, 200],
    ["rampUpSeconds", "rampUpSeconds", -5, 0],
    ["maxRequests", "maxRequests", 0, 1],
    ["maxRequests", "maxRequests", 999_999, 10_000],
  ])("acota %s (%s -> %s)", (_label, field, input, expected) => {
    const value = unwrapStress({ [field]: input }) as unknown as Record<
      string,
      number
    >;
    expect(value[field]).toBe(expected);
  });

  it("un rps NaN cae al mínimo en vez de viajar como NaN", () => {
    expect(unwrapStress({ targetRps: Number.NaN }).targetRps).toBe(1);
  });

  it("convierte el porcentaje de error a fracción", () => {
    expect(unwrapStress({ maxErrorRatePercent: 50 }).maxErrorRate).toBe(0.5);
  });

  /**
   * "0% de errores tolerados" es la expectativa más estricta posible y también
   * la más habitual: un `|| undefined` la haría desaparecer silenciosamente y
   * el umbral no se evaluaría.
   */
  it("una tolerancia del 0% se conserva en vez de desaparecer", () => {
    expect(unwrapStress({ maxErrorRatePercent: 0 }).maxErrorRate).toBe(0);
  });

  it("un porcentaje negativo se interpreta como 'sin umbral'", () => {
    expect(
      unwrapStress({ maxErrorRatePercent: -1 }).maxErrorRate,
    ).toBeUndefined();
  });

  it("un porcentaje por encima de 100 se satura en 1", () => {
    expect(unwrapStress({ maxErrorRatePercent: 150 }).maxErrorRate).toBe(1);
  });

  it("un porcentaje NaN se interpreta como 'sin umbral'", () => {
    expect(
      unwrapStress({ maxErrorRatePercent: Number.NaN }).maxErrorRate,
    ).toBeUndefined();
  });

  it.each(["minThroughputRps", "maxAvgMs", "maxP95Ms", "maxP99Ms"])(
    "un umbral %s en 0 se interpreta como 'sin umbral'",
    (field) => {
      const value = unwrapStress({ [field]: 0 }) as unknown as Record<
        string,
        unknown
      >;
      expect(value[field]).toBeUndefined();
    },
  );

  it.each(["minThroughputRps", "maxAvgMs", "maxP95Ms", "maxP99Ms"])(
    "conserva el umbral %s cuando es positivo",
    (field) => {
      const value = unwrapStress({ [field]: 250 }) as unknown as Record<
        string,
        unknown
      >;
      expect(value[field]).toBe(250);
    },
  );

  it("un ticket vacío queda como undefined", () => {
    expect(unwrapStress({ approvalTicket: "" }).approvalTicket).toBeUndefined();
  });

  it("conserva el ticket de aprobación", () => {
    expect(unwrapStress({ approvalTicket: "OPS-1234" }).approvalTicket).toBe(
      "OPS-1234",
    );
  });

  /**
   * COMPORTAMIENTO FIJADO, NO DESEADO (ver informe): a diferencia del resto de
   * campos de texto, el ticket usa `|| undefined` en vez de trim, así que un
   * ticket en blanco llega al runner como " " (que sí lo rechaza) y silencia el
   * aviso de `buildStressWarnings`.
   */
  it("un ticket en blanco NO se normaliza a undefined (fijado)", () => {
    expect(unwrapStress({ approvalTicket: "   " }).approvalTicket).toBe("   ");
  });

  it("hereda la validación de los bloques JSON del formulario común", () => {
    const result = parseEndpointStressForm(stressForm({ payload: "{ roto" }));
    expect(result.ok).toBe(false);
  });

  it("hereda la validación del host manual", () => {
    const result = parseEndpointStressForm(
      stressForm({ baseRouteKey: "CUSTOM_HOST", customHostUrl: "" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("expectedStatusesText", () => {
  it("formatea la lista para el textarea", () => {
    expect(expectedStatusesText([404, 200])).toBe("200, 404");
  });

  it("un catálogo sin estados usables muestra 200", () => {
    expect(expectedStatusesText(null)).toBe("200");
  });

  /**
   * El texto que este helper pinta en el textarea es el mismo que luego relee
   * el parser: si el round-trip no fuera estable, abrir y guardar un endpoint
   * sin tocar nada cambiaría sus estados esperados.
   */
  it.each([
    ["lista", [200, 404]],
    ["string", "201, 204"],
    ["desordenado", [404, 200]],
  ])("round-trip estable del textarea (%s)", (_label, value) => {
    const text = expectedStatusesText(value);
    expect(
      unwrapRun({ expectedStatusCodes: text }).expectedResponse.statusCodes,
    ).toEqual(text.split(", ").map(Number));
  });
});
