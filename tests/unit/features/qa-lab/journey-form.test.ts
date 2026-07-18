import { describe, expect, it } from "vitest";
import { emptyStep, parseSteps } from "@/features/qa-lab/journey-form";

function expectError(result: ReturnType<typeof parseSteps>): string {
  if (result.ok) throw new Error("Se esperaba un error de validación");
  return result.error;
}

describe("parseSteps · forma general", () => {
  it("acepta una secuencia mínima válida y la devuelve tal cual", () => {
    const result = parseSteps('[{"key":"health","endpointId":"ep-1"}]');
    expect(result).toEqual({
      ok: true,
      value: [{ key: "health", endpointId: "ep-1" }],
    });
  });

  it("rechaza texto que no es JSON en vez de tragárselo", () => {
    expect(parseSteps("no soy json").ok).toBe(false);
  });

  it("rechaza un textarea vacío", () => {
    expect(parseSteps("").ok).toBe(false);
  });

  /**
   * Un journey sin pasos "correría" sin hacer nada y saldría en verde: es justo
   * el falso OK que hay que evitar.
   */
  it.each([
    ["array vacío", "[]"],
    ["objeto", '{"key":"a"}'],
    ["número", "123"],
    ["null", "null"],
    ["string", '"health"'],
  ])("exige un array con al menos un paso (%s)", (_label, text) => {
    expect(expectError(parseSteps(text))).toBe(
      "Debe ser un array con al menos un paso.",
    );
  });
});

describe("parseSteps · validación de cada paso", () => {
  it.each([
    ["null", "[null]"],
    ["string", '["health"]'],
    ["número", "[7]"],
  ])("rechaza un paso que no es un objeto (%s)", (_label, text) => {
    expect(expectError(parseSteps(text))).toBe("Paso 1: debe ser un objeto.");
  });

  it("exige key", () => {
    expect(expectError(parseSteps('[{"endpointId":"ep-1"}]'))).toBe(
      'Paso 1: falta "key".',
    );
  });

  it("rechaza una key vacía", () => {
    expect(expectError(parseSteps('[{"key":"","endpointId":"ep-1"}]'))).toBe(
      'Paso 1: falta "key".',
    );
  });

  it("rechaza una key que no es texto", () => {
    expect(expectError(parseSteps('[{"key":7,"endpointId":"ep-1"}]'))).toBe(
      'Paso 1: falta "key".',
    );
  });

  it("exige endpointId nombrando la key para poder ubicar el paso", () => {
    expect(expectError(parseSteps('[{"key":"health"}]'))).toBe(
      'Paso 1 (health): falta "endpointId".',
    );
  });

  it("rechaza un endpointId vacío", () => {
    expect(
      expectError(parseSteps('[{"key":"health","endpointId":""}]')),
    ).toContain('falta "endpointId"');
  });

  /**
   * El índice es 1-based y debe apuntar al paso realmente roto: si señalara el
   * primero, el operador buscaría el fallo donde no está.
   */
  it("señala el paso concreto que falla, numerado desde 1", () => {
    const text = JSON.stringify([
      { key: "health", endpointId: "ep-1" },
      { key: "start", endpointId: "ep-2" },
      { key: "resumen" },
    ]);
    expect(expectError(parseSteps(text))).toBe(
      'Paso 3 (resumen): falta "endpointId".',
    );
  });

  it("valida todos los pasos, no sólo el primero", () => {
    const text = JSON.stringify([
      { key: "health", endpointId: "ep-1" },
      { key: "start", endpointId: "" },
    ]);
    expect(parseSteps(text).ok).toBe(false);
  });

  it("conserva los campos opcionales del paso", () => {
    const step = {
      key: "start",
      endpointId: "ep-2",
      payload: { channel: "mobile_app" },
      extract: { customerId: "data.customerId" },
      expectedStatusCodes: [200, 201],
    };
    const result = parseSteps(JSON.stringify([step]));
    expect(result).toEqual({ ok: true, value: [step] });
  });
});

describe("emptyStep", () => {
  it("numera la key con el índice recibido", () => {
    expect(emptyStep(3).key).toBe("paso_3");
  });

  it("espera 200/201 por defecto, que es lo típico de un paso de journey", () => {
    expect(emptyStep(1).expectedStatusCodes).toEqual([200, 201]);
  });

  /**
   * Si el array de estados fuera una constante compartida, editar los estados
   * de un paso los cambiaría en todos los demás pasos del journey.
   */
  it("cada paso nuevo trae su propio array de estados esperados", () => {
    const first = emptyStep(1);
    const second = emptyStep(2);
    first.expectedStatusCodes?.push(404);
    expect(second.expectedStatusCodes).toEqual([200, 201]);
  });

  /**
   * Un paso recién añadido está deliberadamente incompleto: la validación debe
   * frenarlo hasta que el operador elija endpoint, en vez de dejar correr un
   * paso que apunta a ningún sitio.
   */
  it("un paso recién creado no pasa la validación hasta asignarle endpoint", () => {
    const result = parseSteps(JSON.stringify([emptyStep(1)]));
    expect(expectError(result)).toContain('falta "endpointId"');
  });

  it("con endpoint asignado, el paso creado sí valida", () => {
    const step = { ...emptyStep(1), endpointId: "ep-1" };
    expect(parseSteps(JSON.stringify([step])).ok).toBe(true);
  });
});
