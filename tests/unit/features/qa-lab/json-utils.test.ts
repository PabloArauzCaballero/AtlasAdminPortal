import { describe, expect, it } from "vitest";
import {
  jsonText,
  parseJsonRecord,
  parseOptionalJsonValue,
  toStringRecord,
} from "@/features/qa-lab/json-utils";

function unwrapRecord(result: ReturnType<typeof parseJsonRecord>) {
  if (!result.ok) throw new Error(`Se esperaba ok, llegó: ${result.error}`);
  return result.value;
}

describe("parseJsonRecord · casos vacíos", () => {
  it.each(["", "   ", "\n\t "])(
    "trata un textarea en blanco (%j) como objeto vacío, no como error",
    (text) => {
      expect(parseJsonRecord(text, "Payload")).toEqual({ ok: true, value: {} });
    },
  );
});

describe("parseJsonRecord · lo que no es un objeto de claves", () => {
  /**
   * Payload/headers/query se mandan al backend como objeto. Aceptar un array o
   * un escalar aquí haría que el error saliera mucho más tarde (o que se
   * mandara basura), así que se rechaza en el formulario.
   */
  it.each([
    ["array", "[1, 2]"],
    ["null", "null"],
    ["número", "42"],
    ["string", '"hola"'],
    ["booleano", "true"],
  ])("rechaza %s porque no es un objeto JSON", (_label, text) => {
    const result = parseJsonRecord(text, "Payload");
    expect(result).toEqual({
      ok: false,
      error: "Payload debe ser un objeto JSON.",
    });
  });
});

describe("parseJsonRecord · JSON malformado", () => {
  it("nombra el bloque que falló para que el operador sepa dónde mirar", () => {
    const result = parseJsonRecord("{ roto", "Query params");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.startsWith("Query params: ")).toBe(true);
  });

  it("no confunde un bloque con otro", () => {
    const result = parseJsonRecord("{ roto", "Headers");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).not.toContain("Payload");
  });
});

describe("parseJsonRecord · payloads reales", () => {
  it("conserva unicode y emoji sin destrozarlos", () => {
    const value = unwrapRecord(
      parseJsonRecord('{"nombre":"José 日本 🎌"}', "Payload"),
    );
    expect(value).toEqual({ nombre: "José 日本 🎌" });
  });

  it("conserva claves anidadas en profundidad", () => {
    const deep = { a: { b: { c: { d: { e: { f: "fondo" } } } } } };
    expect(
      unwrapRecord(parseJsonRecord(JSON.stringify(deep), "Payload")),
    ).toEqual(deep);
  });

  it("acepta un payload grande sin degradarse", () => {
    const big = Object.fromEntries(
      Array.from({ length: 5_000 }, (_, index) => [`k${index}`, index]),
    );
    const value = unwrapRecord(parseJsonRecord(JSON.stringify(big), "Payload"));
    expect(Object.keys(value)).toHaveLength(5_000);
  });

  it("no pierde valores nulos dentro del objeto", () => {
    expect(unwrapRecord(parseJsonRecord('{"a":null}', "Payload"))).toEqual({
      a: null,
    });
  });
});

describe("parseOptionalJsonValue", () => {
  /**
   * Esta distinción es la que usa `assertions.ts`: `undefined` significa "no
   * compruebes el JSON", mientras que `null` es una expectativa real. Si el
   * vacío se colapsara a `null` se añadiría una aserción que nadie pidió.
   */
  it("distingue un textarea vacío (undefined) de un null explícito", () => {
    expect(parseOptionalJsonValue("", "JSON esperado")).toEqual({
      ok: true,
      value: undefined,
    });
    expect(parseOptionalJsonValue("null", "JSON esperado")).toEqual({
      ok: true,
      value: null,
    });
  });

  it("acepta arrays y escalares, a diferencia de parseJsonRecord", () => {
    expect(parseOptionalJsonValue("[1,2]", "JSON esperado")).toEqual({
      ok: true,
      value: [1, 2],
    });
    expect(parseOptionalJsonValue("42", "JSON esperado")).toEqual({
      ok: true,
      value: 42,
    });
  });

  it("nombra el bloque cuando el JSON está roto", () => {
    const result = parseOptionalJsonValue("{ roto", "JSON esperado");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.startsWith("JSON esperado: ")).toBe(true);
  });
});

describe("jsonText", () => {
  it("indenta el objeto para que sea editable en el textarea", () => {
    expect(jsonText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  /**
   * Caso documentado en el propio módulo: algunas respuestas del backend traen
   * las columnas JSONB (minPayloadSchema, etc.) como string JSON en vez de como
   * objeto. Sin esto el textarea mostraba "{}" habiendo schema real.
   */
  it("parsea un schema que el backend serializó como string", () => {
    expect(jsonText('{"tipo":"objeto"}')).toBe('{\n  "tipo": "objeto"\n}');
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["número", 42],
    ["string suelto", '"hola"'],
    ["string que no es JSON", "no soy json"],
  ])(
    "devuelve un objeto vacío editable cuando no hay schema usable (%s)",
    (_label, value) => {
      expect(jsonText(value)).toBe("{}");
    },
  );

  it("conserva unicode al reindentar", () => {
    expect(jsonText({ nombre: "José 🎌" })).toContain("José 🎌");
  });

  it("es idempotente: reindentar lo ya indentado no cambia el contenido", () => {
    const once = jsonText({ b: 2, a: 1 });
    expect(jsonText(once)).toBe(once);
  });
});

describe("toStringRecord", () => {
  it("convierte los valores a string porque una cabecera HTTP es texto", () => {
    expect(toStringRecord({ "x-num": 1, "x-bool": true })).toEqual({
      "x-num": "1",
      "x-bool": "true",
    });
  });

  it("no toca las claves", () => {
    expect(Object.keys(toStringRecord({ "X-Trace-Id": "abc" }))).toEqual([
      "X-Trace-Id",
    ]);
  });

  it('un valor nulo se vuelve el texto "null", no se descarta', () => {
    expect(toStringRecord({ "x-a": null })).toEqual({ "x-a": "null" });
  });

  /**
   * Comportamiento fijado, no deseado: una cabecera con valor objeto acaba como
   * "[object Object]" en el request real. Se pinea para que el día que se
   * decida validarlo, este test lo señale en vez de que pase desapercibido.
   */
  it("un valor objeto degenera en [object Object] (comportamiento fijado)", () => {
    expect(toStringRecord({ "x-a": { b: 1 } })).toEqual({
      "x-a": "[object Object]",
    });
  });

  it("un objeto vacío no inventa cabeceras", () => {
    expect(toStringRecord({})).toEqual({});
  });
});
