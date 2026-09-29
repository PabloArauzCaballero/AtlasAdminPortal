import { describe, expect, it } from "vitest";
import { navGroups } from "@/shared/components/layout/internal-shell/nav-config";
import { assistScreenFor } from "@/features/assist/screen-label";

/**
 * Las pantallas fusionadas salen del menú: una entrada por pantalla, no una por cada vista del
 * mismo dato. Las rutas viejas siguen existiendo como redirecciones, pero ningún enlace del menú
 * apunta a ellas.
 */
const hrefs = navGroups.flatMap((group) =>
  group.items.map((item) => item.href),
);

describe("menú tras las fusiones de metadatos y linaje", () => {
  it("el grupo Lineage tiene una sola entrada, la pantalla con pestañas", () => {
    const lineage = navGroups.find((group) => group.label === "Lineage");
    expect(lineage?.items.map((item) => [item.label, item.href])).toEqual([
      ["Lineage", "/internal/lineage"],
    ]);
  });

  it("ninguna entrada apunta a una ruta retirada", () => {
    for (const retirada of [
      "/internal/lineage/official",
      "/internal/lineage/impact",
      "/internal/business-metadata/glossary",
      "/internal/governance/pii",
      "/internal/exports",
    ]) {
      expect(hrefs).not.toContain(retirada);
    }
  });

  it("Dominios y glosario es una sola entrada con el mismo permiso", () => {
    const item = navGroups
      .flatMap((group) => group.items)
      .find((entry) => entry.href === "/internal/business-metadata/domains");
    expect(item).toMatchObject({
      label: "Dominios y glosario",
      permissions: ["businessMetadata.read"],
    });
  });

  it("el asistente nombra la pantalla nueva", () => {
    expect(assistScreenFor("/internal/lineage")).toContain("Lineage");
    expect(assistScreenFor("/internal/business-metadata/domains")).toContain(
      "Dominios y glosario",
    );
  });
});
