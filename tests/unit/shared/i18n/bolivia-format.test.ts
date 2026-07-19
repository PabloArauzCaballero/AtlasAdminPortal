import { describe, expect, it } from "vitest";
import {
  formatBOB,
  formatDateBO,
  formatDateTimeBO,
  formatDurationMs,
  formatNumberBO,
  formatPercentBO,
} from "@/shared/i18n/bolivia-format";

// Se evita afirmar separadores exactos (varían por versión de ICU): se prueban
// propiedades estables (dígitos preservados, agrupación presente, zona horaria).
const digits = (s: string) => s.replace(/\D/g, "");

describe("formatNumberBO", () => {
  it("agrupa miles y preserva los dígitos", () => {
    const out = formatNumberBO(1234567);
    expect(digits(out)).toBe("1234567");
    expect(out).not.toBe("1234567"); // hay separador de miles
  });

  it("respeta los decimales pedidos", () => {
    expect(digits(formatNumberBO(1234.5, 2))).toBe("123450");
  });
});

describe("formatBOB", () => {
  it("prefija Bs y formatea el monto con dos decimales", () => {
    const out = formatBOB(1234.5);
    expect(out).toMatch(/^Bs /);
    expect(digits(out)).toBe("123450");
  });

  it("formatea cero correctamente", () => {
    expect(formatBOB(0)).toMatch(/^Bs /);
    expect(digits(formatBOB(0))).toBe("000");
  });
});

describe("formatPercentBO", () => {
  it("convierte una razón en porcentaje", () => {
    const out = formatPercentBO(0.5);
    expect(out).toContain("50");
    expect(out).toContain("%");
  });
});

describe("formatDateBO", () => {
  it("usa la zona horaria de Bolivia (UTC-4)", () => {
    // 02:00Z del 18 es 22:00 del 17 en La Paz: debe verse el día 17, no el 18.
    const out = formatDateBO(new Date("2026-07-18T02:00:00Z"));
    expect(out).toContain("2026");
    expect(out).toContain("17");
    expect(out).toContain("07");
    expect(out).not.toContain("18");
  });

  it("acepta un string ISO", () => {
    expect(formatDateBO("2026-01-15T12:00:00Z")).toContain("2026");
  });
});

describe("formatDateTimeBO", () => {
  it("incluye fecha y hora en 24h de Bolivia", () => {
    const out = formatDateTimeBO(new Date("2026-07-18T02:00:00Z"));
    expect(out).toContain("17"); // día en La Paz
    expect(out).toContain("22:00"); // 02:00Z - 4h
  });
});

describe("formatDurationMs", () => {
  it.each([
    [500, "500 ms"],
    [90_000, "1 min 30 s"],
    [3_661_000, "1 h 1 min 1 s"],
    [0, "0 ms"],
    [45_000, "45 s"],
  ])("formatea %i ms como %s", (ms, esperado) => {
    expect(formatDurationMs(ms)).toBe(esperado);
  });
});
