import { describe, expect, it } from "vitest";
import {
  readContract,
  pathParamFields,
} from "@/features/qa-lab/contract-fields";
import { generateCases } from "@/features/qa-lab/qa-case-generator";
import { fakeCase, fakeCases } from "./faker-fixtures";

const LOGIN_CONTRACT = {
  email: "string|required",
  password: "string|required",
};

describe("readContract", () => {
  it("lee el formato abreviado del catálogo (`tipo|required`)", () => {
    expect(readContract(LOGIN_CONTRACT).fields).toEqual([
      { name: "email", type: "string", required: true },
      { name: "password", type: "string", required: true },
    ]);
  });

  it("sin sufijo `required`, el campo es opcional", () => {
    expect(readContract({ note: "string" }).fields[0].required).toBe(false);
  });

  it("lee también la forma JSON Schema", () => {
    const reading = readContract({
      type: "object",
      properties: { amount: { type: "number" }, note: { type: "string" } },
      required: ["amount"],
    });
    expect(reading.fields).toEqual([
      { name: "amount", type: "number", required: true },
      { name: "note", type: "string", required: false },
    ]);
  });

  /**
   * La mayoría de los endpoints catalogados no publican campos, sino el NOMBRE del Zod schema del
   * backend. Confundir eso con un contrato produciría un payload `{ schemaReference: "..." }`, que
   * es exactamente el tipo de basura que el laboratorio debe evitar mandar.
   */
  it("distingue un puntero a schema de un contrato de campos", () => {
    const reading = readContract({ schemaReference: "loginSchema" });
    expect(reading.isReference).toBe(true);
    expect(reading.referenceName).toBe("loginSchema");
    expect(reading.fields).toHaveLength(0);
  });

  it("un contrato vacío o ausente no produce campos", () => {
    expect(readContract({}).fields).toHaveLength(0);
    expect(readContract(null).fields).toHaveLength(0);
    expect(readContract(undefined).fields).toHaveLength(0);
  });
});

describe("pathParamFields", () => {
  it("extrae los :parametros de la ruta y los marca obligatorios", () => {
    expect(
      pathParamFields("/api/v1/customers/:customerId/loans/:loanId"),
    ).toEqual([
      { name: "customerId", type: "string", required: true },
      { name: "loanId", type: "string", required: true },
    ]);
  });

  it("una ruta sin parámetros no produce campos", () => {
    expect(pathParamFields("/api/v1/auth/login")).toEqual([]);
    expect(pathParamFields(null)).toEqual([]);
  });
});

describe("generateCases", () => {
  const fields = readContract(LOGIN_CONTRACT).fields;
  const cases = fakeCases(4);
  const gen = (
    kind: "valid" | "boundary" | "invalid",
    count: number,
    seed = "qa-base",
    input: Partial<Parameters<typeof generateCases>[0]> = {},
  ) => generateCases({ fields, kind, count, seed, cases, ...input });

  /**
   * El determinismo es la razón de ser de la semilla: sin él, «repite la corrida que falló» no
   * existe y comparar dos ejecuciones no significa nada.
   */
  it("la misma semilla y el mismo lote producen exactamente los mismos casos", () => {
    expect(gen("valid", 3)).toEqual(gen("valid", 3));
  });

  it("los datos de persona salen del lote del generador, caso por caso", () => {
    const generated = gen("valid", 3);
    expect(generated.map((item) => item.payload.email)).toEqual([
      "persona0@qa.atlas.test",
      "persona1@qa.atlas.test",
      "persona2@qa.atlas.test",
    ]);
  });

  it("la contraseña es un PIN local de 4 dígitos que el backend acepta", () => {
    const [first] = gen("valid", 1);
    expect(String(first.payload.password)).toMatch(/^\d{4}$/);
  });

  it("reconoce `identifier` como identidad de acceso (el correo del caso)", () => {
    const fields = readContract({ identifier: "string|required" }).fields;
    const [first] = generateCases({
      fields,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
    });
    expect(first.payload.identifier).toBe("persona0@qa.atlas.test");
  });

  it("sin lote del generador no inventa datos de persona: los marca sin resolver", () => {
    const [first] = generateCases({
      fields,
      kind: "valid",
      count: 1,
      seed: "s",
      cases: [],
    });
    expect(first.payload).not.toHaveProperty("email");
    expect(first.unresolved).toEqual(["email"]);
  });

  it("por defecto sólo genera los obligatorios", () => {
    const mixed = readContract({
      email: "string|required",
      note: "string",
      status: "active|blocked",
    }).fields;
    const [first] = generateCases({
      fields: mixed,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
    });
    expect(Object.keys(first.payload)).toEqual(["email"]);
    const [all] = generateCases({
      fields: mixed,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
      includeOptional: true,
    });
    expect(Object.keys(all.payload).sort()).toEqual([
      "email",
      "note",
      "status",
    ]);
    expect(["active", "blocked"]).toContain(all.payload.status);
  });

  it("si ninguno es obligatorio, genera todos", () => {
    const optional = readContract({ note: "string", flag: "boolean" }).fields;
    const [first] = generateCases({
      fields: optional,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
    });
    expect(Object.keys(first.payload).sort()).toEqual(["flag", "note"]);
  });

  /** `lat` terminaba en «at» y salía como fecha. */
  it("lat y lng son coordenadas del caso, no fechas", () => {
    const geo = readContract({
      lat: "number|required",
      lng: "number|required",
    }).fields;
    const [first] = generateCases({
      fields: geo,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
    });
    expect(first.payload.lat).toBe(-16.5);
    expect(first.payload.lng).toBe(-68.1);
  });

  it("una fecha de evento (`capturedAt`) sí es una fecha", () => {
    const event = readContract({ capturedAt: "string|required" }).fields;
    const [first] = generateCases({
      fields: event,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
    });
    expect(String(first.payload.capturedAt)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("un objeto con campos declarados se rellena por dentro, no con {}", () => {
    const nested = readContract({
      customer: {
        type: "object",
        required: true,
        phone: "string|required",
        email: "string|required",
      },
    }).fields;
    const [first] = generateCases({
      fields: nested,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
    });
    expect(first.payload.customer).toEqual({
      phone: "+59170000000",
      email: "persona0@qa.atlas.test",
    });
  });

  it("un objeto `device` sin campos recibe el dispositivo entero del caso", () => {
    const device = readContract({ device: "object|required" }).fields;
    const [first] = generateCases({
      fields: device,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
    });
    expect(first.payload.device).toMatchObject({
      channel: "mobile_app",
      fingerprintVersion: "v1",
    });
  });

  it("un importe sale del monto del lote", () => {
    const amount = readContract({ amount: "number|required" }).fields;
    const [first] = generateCases({
      fields: amount,
      kind: "valid",
      count: 1,
      seed: "s",
      cases,
    });
    expect(first.payload.amount).toBe(150.5);
  });

  /**
   * La clase inválida cubre UN caso por campo obligatorio antes de repetirse. Generarla al azar
   * dejaría reglas del contrato sin probar mientras se repite tres veces la misma violación.
   */
  it("los inválidos quitan cada campo obligatorio, uno por caso", () => {
    const generated = gen("invalid", 2);
    expect(generated[0].payload).not.toHaveProperty("email");
    expect(generated[1].payload).not.toHaveProperty("password");
    expect(generated.map((item) => item.mutation)).toEqual([
      "falta el campo obligatorio email",
      "falta el campo obligatorio password",
    ]);
  });

  it("agotados los obligatorios, los inválidos siguen por tipo erróneo", () => {
    const generated = gen("invalid", 3);
    expect(generated[2].payload.email).toBe(12345);
    expect(generated[2].mutation).toContain("deja de ser string");
  });

  it("si el generador rompió un dato que el contrato lleva, el caso lo usa y dice por qué", () => {
    const broken = fakeCase(0);
    broken.caso = {
      ...broken.caso,
      persona: { ...(broken.caso?.persona as object), email: "no-es-correo" },
      _invalid: { field: "persona.email", reason: "Correo sin arroba." },
    };
    const [first] = generateCases({
      fields,
      kind: "invalid",
      count: 1,
      seed: "s",
      cases: [broken],
    });
    expect(first.payload.email).toBe("no-es-correo");
    expect(first.mutation).toBe("Correo sin arroba.");
  });

  it("los de frontera usan el lote en el borde cuando hay datos de persona", () => {
    const [first] = gen("boundary", 1);
    expect(first.mutation).toBe("datos de persona en el borde de lo admitido");
    expect(first.payload.email).toBe("persona0@qa.atlas.test");
  });

  it("sin datos de persona, frontera lleva un campo local a su extremo según el tipo", () => {
    const mixed = readContract({
      total: "number|required",
      items: "array|required",
      active: "boolean|required",
    }).fields;
    const generated = generateCases({
      fields: mixed,
      kind: "boundary",
      count: 3,
      seed: "s",
      cases,
    });
    expect(generated[0].payload.total).toBe(0);
    expect(generated[1].payload.items).toEqual([]);
    expect(generated[2].payload.active).toBe(false);
  });

  it("sin campos no hay nada que generar", () => {
    expect(
      generateCases({ fields: [], kind: "valid", count: 5, seed: "s", cases }),
    ).toEqual([]);
  });
});

describe("readContract · formas del catálogo sembrado", () => {
  it("una marca sola (`optional`, `required`) no es un tipo", () => {
    expect(readContract({ page: "optional", id: "required" }).fields).toEqual([
      { name: "page", type: "unknown", required: false },
      { name: "id", type: "unknown", required: true },
    ]);
  });

  it("`all|risk|fraud` es una lista de valores, no un tipo desconocido", () => {
    expect(readContract({ queue: "all|risk|fraud" }).fields[0]).toEqual({
      name: "queue",
      type: "string",
      required: false,
      options: ["all", "risk", "fraud"],
    });
  });

  it("`positive integer|required` es entero obligatorio", () => {
    expect(
      readContract({ customerId: "positive integer|required" }).fields[0],
    ).toEqual({
      name: "customerId",
      type: "integer",
      required: true,
    });
  });
});
