import { describe, expect, it } from "vitest";
import { catalogPath } from "@/features/data-exports/download-catalog";
import { exportDestination } from "@/features/data-exports/export-destinations";

/**
 * «Exportaciones» dejó de ser pantalla: el botón «Descargar JSON» vive en la cabecera de Endpoints,
 * Catálogo de datos y Reglas de calidad. Lo que queda aquí es la ruta de descarga y a dónde lleva
 * cada catálogo exportable que alguien tuviera enlazado.
 */
describe("descarga de catálogos", () => {
  it("la ruta de descarga se resuelve contra la propia API y nunca sigue otro origen", () => {
    expect(catalogPath("/api/v1/systems/data-entities")).toBe(
      "/systems/data-entities",
    );
    expect(catalogPath("/internal/data-quality/rules")).toBe(
      "/internal/data-quality/rules",
    );
    expect(catalogPath("https://otro.example/datos")).toBeNull();
    expect(catalogPath("//otro.example/datos")).toBeNull();
    expect(catalogPath("")).toBeNull();
  });

  it("cada exportación enlazada lleva a la pantalla que tiene su botón", () => {
    expect(exportDestination("export-endpoint-catalog")).toBe(
      "/internal/systems/endpoints",
    );
    expect(exportDestination("export-data-catalog")).toBe(
      "/internal/data-catalog/tables",
    );
    expect(exportDestination(encodeURIComponent("export-data-quality"))).toBe(
      "/internal/data-quality/rules",
    );
    expect(exportDestination("desconocida")).toBe(
      "/internal/data-catalog/tables",
    );
  });
});
