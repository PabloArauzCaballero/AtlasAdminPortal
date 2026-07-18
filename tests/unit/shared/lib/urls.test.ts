import { describe, expect, it } from "vitest";
import { isSafeExternalUrl, isSafeInternalPath } from "@/shared/lib/urls";

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

describe("isSafeExternalUrl · destinos permitidos", () => {
  it("acepta cualquier origen https", () => {
    // A diferencia de `isSafeInternalPath`, aquí sí se permite salir del portal
    // mientras el transporte sea cifrado (enlaces a documentación, proveedores).
    expect(isSafeExternalUrl("https://docs.example.com/guia")).toBe(true);
  });

  it("acepta el propio origen del portal", () => {
    expect(isSafeExternalUrl(window.location.origin)).toBe(true);
  });

  it("acepta una ruta relativa, que se resuelve contra el origen propio", () => {
    expect(isSafeExternalUrl("/internal/systems/endpoints")).toBe(true);
  });

  it("acepta http solo contra localhost (backend de desarrollo)", () => {
    // El backend local corre en http://localhost:3005 sin TLS: sin esta excepción
    // los enlaces al servicio no funcionarían en desarrollo.
    expect(isSafeExternalUrl("http://localhost:3005/api/v1/health")).toBe(true);
    expect(isSafeExternalUrl("http://127.0.0.1:3005/health")).toBe(true);
  });

  it("acepta el loopback IPv6, que `URL` devuelve entre corchetes", () => {
    // Regresión: `URL.hostname` da "[::1]", así que la entrada "::1" de la
    // allowlist era config muerta y el loopback IPv6 se rechazaba en silencio.
    expect(isSafeExternalUrl("http://[::1]:3005/health")).toBe(true);
    expect(isSafeExternalUrl("http://[::1]/health")).toBe(true);
  });

  it("no acepta cualquier IPv6 por llevar corchetes", () => {
    // El complemento del fix: quitar los corchetes no debe abrir la allowlist a
    // otras direcciones IPv6.
    expect(isSafeExternalUrl("http://[2001:db8::1]/x")).toBe(false);
  });
});

describe("isSafeExternalUrl · destinos rechazados", () => {
  it("rechaza http contra un host externo", () => {
    // Enviar a un operador por texto plano a un host ajeno es MITM servido.
    expect(isSafeExternalUrl("http://evil.example.com")).toBe(false);
  });

  it("rechaza un host que solo contiene `localhost` como subcadena", () => {
    // `localhost.evil.com` NO es local: la comprobación es por hostname exacto.
    expect(isSafeExternalUrl("http://localhost.evil.com")).toBe(false);
    expect(isSafeExternalUrl("http://notlocalhost")).toBe(false);
  });

  it("rechaza esquemas peligrosos aunque `new URL` los parsee", () => {
    // `new URL("javascript:...")` no lanza: el filtro real es la allowlist de
    // protocolos, no el try/catch.
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
  });

  it("rechaza otros esquemas sin TLS", () => {
    expect(isSafeExternalUrl("ftp://archivos.example.com")).toBe(false);
    expect(isSafeExternalUrl("ws://evil.example.com")).toBe(false);
  });

  it("rechaza una URL que no se puede parsear", () => {
    expect(isSafeExternalUrl("http://")).toBe(false);
    expect(isSafeExternalUrl("https://")).toBe(false);
  });
});
