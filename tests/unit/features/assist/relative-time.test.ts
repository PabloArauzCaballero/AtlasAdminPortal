import { describe, expect, it } from "vitest";
import {
  contarMensajes,
  formatRelativa,
} from "@/features/assist/relative-time";

const AHORA = new Date("2026-09-29T12:00:00.000Z");

describe("formatRelativa", () => {
  it.each([
    ["2026-09-29T11:59:40.000Z", "ahora"],
    ["2026-09-29T11:55:00.000Z", "hace 5 min"],
    ["2026-09-29T09:00:00.000Z", "hace 3 h"],
    ["2026-09-28T09:00:00.000Z", "ayer"],
    ["2026-09-25T12:00:00.000Z", "hace 4 días"],
  ])("%s -> %s", (iso, esperado) => {
    expect(formatRelativa(iso, AHORA)).toBe(esperado);
  });

  it("pasada una semana da día y mes; una fecha rota da vacío", () => {
    expect(formatRelativa("2026-09-01T12:00:00.000Z", AHORA)).toMatch(
      /1.*sep/i,
    );
    expect(formatRelativa("no-es-fecha", AHORA)).toBe("");
  });
});

describe("contarMensajes", () => {
  it("cada turno son dos mensajes", () => {
    expect(contarMensajes(1)).toBe("2 mensajes");
    expect(contarMensajes(0)).toBe("0 mensajes");
  });
});
