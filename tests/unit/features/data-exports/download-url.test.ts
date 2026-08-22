import { describe, expect, it } from "vitest";
import { resolveExportDownloadUrl } from "@/features/data-exports/download-url";

const API_BASE = "http://localhost:3005/api/v1";

describe("resolveExportDownloadUrl", () => {
  it("resuelve la ruta relativa contra el origen del API, no el del portal", () => {
    // Caso real del backend: devuelve /api/v1/... relativo al API. Si se abriera
    // tal cual, el navegador lo pediría al portal (:5273), que no sirve /api/*.
    expect(
      resolveExportDownloadUrl("/api/v1/systems/endpoints", API_BASE),
    ).toBe("http://localhost:3005/api/v1/systems/endpoints");
  });

  it("respeta una URL absoluta (URL firmada del backend)", () => {
    const signed = "https://files.atlas.internal/export.csv?sig=abc&exp=123";
    expect(resolveExportDownloadUrl(signed, API_BASE)).toBe(signed);
  });

  it("cuelga la ruta sin barra inicial del path base del API", () => {
    expect(resolveExportDownloadUrl("files/export.csv", API_BASE)).toBe(
      "http://localhost:3005/api/v1/files/export.csv",
    );
  });

  it("rechaza protocol-relative: apunta a otro host disfrazado de ruta interna", () => {
    expect(
      resolveExportDownloadUrl("//evil.example/export.csv", API_BASE),
    ).toBe(null);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["vacío", ""],
    ["solo espacios", "   "],
  ])("devuelve null si el downloadUrl es %s", (_label, value) => {
    expect(resolveExportDownloadUrl(value, API_BASE)).toBe(null);
  });

  it("devuelve null si la base del API no es una URL válida", () => {
    expect(resolveExportDownloadUrl("/x.csv", "no-es-una-url")).toBe(null);
  });

  it("preserva query y fragmento de la ruta relativa", () => {
    expect(
      resolveExportDownloadUrl("/exports/1?format=csv#top", API_BASE),
    ).toBe("http://localhost:3005/exports/1?format=csv#top");
  });
});
