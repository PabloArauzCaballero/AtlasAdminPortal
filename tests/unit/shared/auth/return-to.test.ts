import { describe, expect, it } from "vitest";
import { sanitizeInternalReturnTo } from "@/shared/auth/return-to";

const FALLBACK = "/internal";

describe("sanitizeInternalReturnTo", () => {
  describe("acepta destinos internos legítimos", () => {
    it("devuelve la raíz interna tal cual", () => {
      expect(sanitizeInternalReturnTo("/internal")).toBe("/internal");
    });

    it("conserva una ruta interna profunda", () => {
      expect(sanitizeInternalReturnTo("/internal/systems/dashboard")).toBe(
        "/internal/systems/dashboard",
      );
    });

    it("conserva la query string de una ruta interna", () => {
      expect(sanitizeInternalReturnTo("/internal/qa/runs?page=2")).toBe(
        "/internal/qa/runs?page=2",
      );
    });

    it("decodifica un destino interno codificado", () => {
      expect(sanitizeInternalReturnTo("%2Finternal%2Fsystems")).toBe(
        "/internal/systems",
      );
    });
  });

  describe("bloquea redirecciones fuera del portal (open redirect)", () => {
    it.each([
      ["URL absoluta http", "https://evil.example/phish"],
      ["URL protocol-relative", "//evil.example"],
      ["URL protocol-relative codificada", "%2F%2Fevil.example"],
      ["ruta fuera de /internal", "/otra/seccion"],
      ["prefijo engañoso sin barra", "/internalfoo"],
      ["backslash", "\\\\evil.example"],
      ["esquema javascript", "javascript:alert(1)"],
    ])("descarta %s", (_label, malicious) => {
      expect(sanitizeInternalReturnTo(malicious)).toBe(FALLBACK);
    });

    it("descarta una ruta interna que contiene doble barra", () => {
      expect(sanitizeInternalReturnTo("/internal//evil.example")).toBe(
        FALLBACK,
      );
    });
  });

  describe("evita el bucle de login", () => {
    it("descarta la propia ruta de login", () => {
      expect(sanitizeInternalReturnTo("/internal/login")).toBe(FALLBACK);
    });

    it("descarta la ruta de login con query", () => {
      expect(
        sanitizeInternalReturnTo("/internal/login?returnTo=%2Finternal"),
      ).toBe(FALLBACK);
    });
  });

  describe("entradas vacías o inválidas", () => {
    it("devuelve el fallback si el valor es null", () => {
      expect(sanitizeInternalReturnTo(null)).toBe(FALLBACK);
    });

    it("devuelve el fallback si el valor es una cadena vacía", () => {
      expect(sanitizeInternalReturnTo("")).toBe(FALLBACK);
    });

    it("devuelve el fallback si el porcentaje está mal formado", () => {
      // decodeURIComponent lanza URIError: no debe propagarse.
      expect(sanitizeInternalReturnTo("%E0%A4%A")).toBe(FALLBACK);
    });

    it("no lanza nunca ante entradas arbitrarias", () => {
      expect(() => sanitizeInternalReturnTo("%%%")).not.toThrow();
    });
  });
});
