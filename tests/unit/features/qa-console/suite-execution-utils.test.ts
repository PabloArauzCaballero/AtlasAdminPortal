import { describe, expect, it } from "vitest";
import {
  normalizeExecutionEnvironments,
  normalizeHeaders,
  parseJsonRecord,
  validateExecutionForm,
} from "@/features/qa-console/suite-execution-utils";

describe("normalizeExecutionEnvironments", () => {
  it("pasa el scope a mayúsculas", () => {
    expect(normalizeExecutionEnvironments(["local", "staging"], false)).toEqual(
      ["LOCAL", "STAGING"],
    );
  });

  it("cae a LOCAL cuando el scope viene vacío", () => {
    expect(normalizeExecutionEnvironments([], false)).toEqual(["LOCAL"]);
  });

  it("quita PRODUCTION_READONLY si la suite no es segura para producción", () => {
    expect(
      normalizeExecutionEnvironments(["LOCAL", "PRODUCTION_READONLY"], false),
    ).toEqual(["LOCAL"]);
  });

  it("conserva PRODUCTION_READONLY si la suite es segura", () => {
    expect(
      normalizeExecutionEnvironments(["PRODUCTION_READONLY"], true),
    ).toEqual(["PRODUCTION_READONLY"]);
  });
});

describe("validateExecutionForm", () => {
  const ok = {
    dryRun: true,
    baseUrl: "",
    headersText: "",
    configText: "",
  };

  it("exige Base URL en una corrida real", () => {
    expect(
      validateExecutionForm({ ...ok, dryRun: false, baseUrl: "  " }),
    ).toMatch(/Base URL/);
  });

  it("permite Base URL vacía en dry-run", () => {
    expect(validateExecutionForm(ok)).toBeNull();
  });

  it("acepta headers y config JSON válidos", () => {
    expect(
      validateExecutionForm({
        ...ok,
        headersText: '{"a":"b"}',
        configText: '{"c":1}',
      }),
    ).toBeNull();
  });

  it("rechaza headers que no son objeto JSON", () => {
    expect(validateExecutionForm({ ...ok, headersText: "[1,2,3]" })).toMatch(
      /objetos JSON/,
    );
  });

  it("rechaza JSON corrupto y propaga el mensaje del parser", () => {
    expect(validateExecutionForm({ ...ok, configText: "{roto" })).toBeTruthy();
  });
});

describe("parseJsonRecord", () => {
  it("una cadena vacía es un objeto vacío", () => {
    expect(parseJsonRecord("")).toEqual({});
  });

  it("rechaza un array", () => {
    expect(() => parseJsonRecord("[1]")).toThrow(/objetos JSON/);
  });

  it("rechaza null", () => {
    expect(() => parseJsonRecord("null")).toThrow(/objetos JSON/);
  });

  it("acepta un objeto", () => {
    expect(parseJsonRecord('{"x":1}')).toEqual({ x: 1 });
  });
});

describe("normalizeHeaders", () => {
  it("convierte todos los valores a string", () => {
    expect(normalizeHeaders({ a: 1, b: true, c: "z" })).toEqual({
      a: "1",
      b: "true",
      c: "z",
    });
  });
});
