import { describe, expect, it } from "vitest";
import {
  maskAccount,
  maskByType,
  maskDocument,
  maskEmail,
  maskPhone,
} from "@/shared/security/pii-formatters";

/** Todo el prefijo oculto debe ser puntos: no se filtra nada del valor. */
function prefixIsAllDots(masked: string, visibleSuffix: string): boolean {
  const hidden = masked.slice(0, masked.length - visibleSuffix.length);
  return /^•+$/.test(hidden);
}

describe("maskEmail", () => {
  it("deja la primera letra y el dominio, oculta el resto del local", () => {
    const out = maskEmail("juan.perez@atlas.bo");
    expect(out).toMatch(/^j•+@atlas\.bo$/);
    expect(out).not.toContain("uan.perez");
  });

  it("enmascara algo sin @ como genérico (solo puntos)", () => {
    expect(maskEmail("noesunemail")).toMatch(/^•+$/);
  });
});

describe("maskPhone", () => {
  it("deja solo los últimos 4 dígitos", () => {
    const out = maskPhone("+591 71234567");
    expect(out.endsWith("4567")).toBe(true);
    expect(out).not.toContain("7123");
    expect(prefixIsAllDots(out, "4567")).toBe(true);
  });

  it("ignora separadores al contar", () => {
    expect(maskPhone("7-123-4567")).toBe("••••4567");
  });
});

describe("maskDocument", () => {
  it("deja los últimos 3", () => {
    const out = maskDocument("1234567");
    expect(out.endsWith("567")).toBe(true);
    expect(prefixIsAllDots(out, "567")).toBe(true);
  });
});

describe("maskAccount", () => {
  it("deja los últimos 4 y oculta el resto", () => {
    const out = maskAccount("4000123412341234");
    expect(out.endsWith("1234")).toBe(true);
    expect(out).not.toContain("400012341234");
    expect(prefixIsAllDots(out, "1234")).toBe(true);
  });
});

describe("maskByType", () => {
  it("despacha según el tipo", () => {
    expect(maskByType("juan@atlas.bo", "email")).toContain("@atlas.bo");
    expect(maskByType("71234567", "phone")).toBe("••••4567");
  });

  it("devuelve cadena vacía ante un valor vacío", () => {
    expect(maskByType("", "email")).toBe("");
  });

  it("el tipo genérico oculta todo el valor", () => {
    expect(maskByType("secreto", "generic")).toMatch(/^•+$/);
  });
});
