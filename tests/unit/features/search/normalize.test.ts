import { describe, expect, it } from "vitest";
import { normalizeSearchPayload } from "@/features/search/normalize";

function payloadWithHref(href: unknown) {
  return {
    items: [
      {
        id: "1",
        kind: "Endpoint",
        title: "Listar usuarios",
        href,
      },
    ],
  };
}

describe("normalizeSearchPayload · href seguro", () => {
  it("conserva una ruta interna válida", () => {
    const result = normalizeSearchPayload(
      payloadWithHref("/internal/systems/endpoints/1"),
    );
    expect(result.items[0].href).toBe("/internal/systems/endpoints/1");
  });

  it("descarta javascript: en vez de dejarlo llegar al <Link>", () => {
    const result = normalizeSearchPayload(
      payloadWithHref("javascript:alert(1)"),
    );
    expect(result.items[0].href).toBeNull();
  });

  it("descarta un host externo absoluto", () => {
    const result = normalizeSearchPayload(
      payloadWithHref("https://evil.example.com/phish"),
    );
    expect(result.items[0].href).toBeNull();
  });

  it("descarta una URL protocol-relative", () => {
    const result = normalizeSearchPayload(
      payloadWithHref("//evil.example.com/phish"),
    );
    expect(result.items[0].href).toBeNull();
  });

  it("descarta un href ausente en vez de inventar /internal/search", () => {
    const result = normalizeSearchPayload(payloadWithHref(undefined));
    expect(result.items[0].href).toBeNull();
  });

  it("descarta un href que no es string", () => {
    const result = normalizeSearchPayload(payloadWithHref({ evil: true }));
    expect(result.items[0].href).toBeNull();
  });

  it("el resultado sigue siendo utilizable aunque el href se descarte", () => {
    const result = normalizeSearchPayload(
      payloadWithHref("javascript:alert(1)"),
    );
    expect(result.items[0].title).toBe("Listar usuarios");
    expect(result.items[0].kind).toBe("Endpoint");
  });
});
