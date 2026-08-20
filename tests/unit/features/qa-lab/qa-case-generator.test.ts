import { describe, expect, it } from "vitest";
import {
  readContract,
  pathParamFields,
} from "@/features/qa-lab/contract-fields";
import { generateCases } from "@/features/qa-lab/qa-case-generator";

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

  /**
   * El determinismo es la razón de ser de la semilla: sin él, «repite la corrida que falló» no
   * existe y comparar dos ejecuciones no significa nada.
   */
  it("la misma semilla produce exactamente el mismo lote", () => {
    const first = generateCases(fields, "valid", 3, "qa-base");
    const second = generateCases(fields, "valid", 3, "qa-base");
    expect(second).toEqual(first);
  });

  it("semillas distintas producen lotes distintos", () => {
    const base = generateCases(fields, "valid", 3, "qa-base");
    const other = generateCases(fields, "valid", 3, "qa-regresion");
    expect(other).not.toEqual(base);
  });

  it("los casos válidos traen todos los campos del contrato", () => {
    for (const generated of generateCases(fields, "valid", 4, "qa-base")) {
      expect(Object.keys(generated.payload).sort()).toEqual([
        "email",
        "password",
      ]);
    }
  });

  it("da un valor creíble según el nombre del campo, no un relleno", () => {
    const [first] = generateCases(fields, "valid", 1, "qa-base");
    expect(String(first.payload.email)).toMatch(/^[a-z.]+@atlas\.test$/);
  });

  it("un teléfono sale con prefijo boliviano", () => {
    const phoneFields = readContract({ phone: "string|required" }).fields;
    const [first] = generateCases(phoneFields, "valid", 1, "qa-base");
    expect(String(first.payload.phone)).toMatch(/^\+591\d{8}$/);
  });

  /**
   * La clase inválida cubre UN caso por campo obligatorio antes de repetirse. Generarla al azar
   * dejaría reglas del contrato sin probar mientras se repite tres veces la misma violación.
   */
  it("los inválidos quitan cada campo obligatorio, uno por caso", () => {
    const cases = generateCases(fields, "invalid", 2, "qa-base");
    expect(cases[0].payload).not.toHaveProperty("email");
    expect(cases[1].payload).not.toHaveProperty("password");
    expect(cases.map((item) => item.mutation)).toEqual([
      "falta el campo obligatorio email",
      "falta el campo obligatorio password",
    ]);
  });

  it("agotados los obligatorios, los inválidos siguen por tipo erróneo", () => {
    const cases = generateCases(fields, "invalid", 3, "qa-base");
    expect(cases[2].payload.email).toBe(12345);
    expect(cases[2].mutation).toContain("deja de ser string");
  });

  it("los de frontera mantienen todos los campos y llevan uno al extremo", () => {
    const cases = generateCases(fields, "boundary", 1, "qa-base");
    expect(Object.keys(cases[0].payload).sort()).toEqual(["email", "password"]);
    expect(cases[0].payload.email).toBe("");
  });

  it("el valor extremo depende del tipo", () => {
    const mixed = readContract({
      total: "number|required",
      items: "array|required",
      active: "boolean|required",
    }).fields;
    const cases = generateCases(mixed, "boundary", 3, "qa-base");
    expect(cases[0].payload.total).toBe(0);
    expect(cases[1].payload.items).toEqual([]);
    expect(cases[2].payload.active).toBe(false);
  });

  it("sin campos no hay nada que generar", () => {
    expect(generateCases([], "valid", 5, "qa-base")).toEqual([]);
  });
});
