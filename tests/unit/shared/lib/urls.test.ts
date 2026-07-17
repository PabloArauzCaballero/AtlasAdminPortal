import { describe, expect, it } from "vitest";
import { isSafeInternalPath } from "@/shared/lib/urls";

// Se construyen por code point: escribirlos literales en el fuente los vuelve
// invisibles y hace imposible revisar el test.
const NUL = String.fromCharCode(0x00);
const TAB = String.fromCharCode(0x09);
const NEWLINE = String.fromCharCode(0x0a);
const DEL = String.fromCharCode(0x7f);

describe("isSafeInternalPath · rutas internas legítimas", () => {
  it("acepta una ruta interna simple", () => {
    expect(isSafeInternalPath("/internal/systems/endpoints")).toBe(true);
  });

  it("acepta rutas con guiones: el guion no es un carácter de control", () => {
    expect(isSafeInternalPath("/internal/data-quality/issues")).toBe(true);
    expect(isSafeInternalPath("/internal/schema/change-log")).toBe(true);
  });

  it("acepta query string y fragmento", () => {
    expect(isSafeInternalPath("/internal/search?q=algo&page=2")).toBe(true);
    expect(isSafeInternalPath("/internal/tabla#columnas")).toBe(true);
  });

  it("acepta la raíz", () => {
    expect(isSafeInternalPath("/")).toBe(true);
  });
});

describe("isSafeInternalPath · redirección abierta", () => {
  it("rechaza URL protocol-relative", () => {
    expect(isSafeInternalPath("//evil.example.com")).toBe(false);
    expect(isSafeInternalPath("//evil.example.com/phish")).toBe(false);
  });

  it("rechaza la variante con backslash que algunos navegadores normalizan", () => {
    expect(isSafeInternalPath("/\\evil.example.com")).toBe(false);
  });

  it("rechaza un host externo absoluto", () => {
    expect(isSafeInternalPath("https://evil.example.com")).toBe(false);
    expect(isSafeInternalPath("http://evil.example.com")).toBe(false);
  });
});

describe("isSafeInternalPath · esquemas peligrosos", () => {
  it("rechaza javascript:", () => {
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false);
  });

  it("rechaza data: y file:", () => {
    expect(isSafeInternalPath("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
    expect(isSafeInternalPath("file:///etc/passwd")).toBe(false);
  });

  it("rechaza rutas con caracteres de control", () => {
    expect(isSafeInternalPath(`java${TAB}script:alert(1)`)).toBe(false);
    expect(isSafeInternalPath(`/internal/${NUL}x`)).toBe(false);
    expect(isSafeInternalPath(`/internal${NEWLINE}/x`)).toBe(false);
    expect(isSafeInternalPath(`/internal/${DEL}`)).toBe(false);
  });
});

describe("isSafeInternalPath · entradas degeneradas", () => {
  it("rechaza cadena vacía y rutas relativas", () => {
    expect(isSafeInternalPath("")).toBe(false);
    expect(isSafeInternalPath("internal/systems")).toBe(false);
    expect(isSafeInternalPath("./internal")).toBe(false);
  });
});
