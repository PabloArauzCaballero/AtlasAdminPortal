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
  it("el grupo Linaje tiene una sola entrada, la pantalla con pestañas", () => {
    const lineage = navGroups.find((group) => group.label === "Linaje");
    expect(lineage?.items.map((item) => [item.label, item.href])).toEqual([
      ["Linaje", "/internal/lineage"],
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
    expect(assistScreenFor("/internal/lineage")).toContain("Linaje");
    expect(assistScreenFor("/internal/business-metadata/domains")).toContain(
      "Dominios y glosario",
    );
  });
});

describe("menú tras la fusión de Operaciones (2026-10-07)", () => {
  const operaciones = navGroups.find((group) => group.label === "Operaciones");

  it("Operaciones es el primer grupo y tiene siete entradas", () => {
    expect(navGroups[0]?.label).toBe("Operaciones");
    expect(operaciones?.items.map((item) => item.label)).toEqual([
      "Cola de trabajo",
      "Comercios",
      "Préstamos y cartera",
      "Productos de crédito",
      "Archivos",
      "Soporte",
      "Notificaciones",
    ]);
  });

  it("cada fusión conserva las rutas de sus pantallas como pestañas", () => {
    const pestañas = Object.fromEntries(
      (operaciones?.items ?? [])
        .filter((item) => item.tabs)
        .map((item) => [item.label, item.tabs?.map((tab) => tab.href)]),
    );
    expect(pestañas).toEqual({
      "Cola de trabajo": [
        "/internal/operations/work-queue",
        "/internal/operations/pending-contacts",
        "/internal/operations/payment-claims",
      ],
      Comercios: ["/internal/operations/partners", "/internal/merchant-users"],
      "Préstamos y cartera": [
        "/internal/operations/loans",
        "/internal/operations/portfolio",
      ],
      Soporte: [
        "/internal/support",
        "/internal/support/knowledge",
        "/internal/support/agents",
      ],
      Notificaciones: [
        "/internal/notifications",
        "/internal/notifications/campaigns",
      ],
    });
  });

  it("ninguna ruta se queda sin entrada: las que salieron de Operaciones están en otro grupo", () => {
    const grupoDe = (href: string) =>
      navGroups.find((group) =>
        group.items.some(
          (item) =>
            item.href === href || item.tabs?.some((tab) => tab.href === href),
        ),
      )?.label;
    expect(grupoDe("/internal/views")).toBe("Reportes");
    expect(grupoDe("/internal/events")).toBe("Sistemas");
    expect(grupoDe("/internal/jobs")).toBe("Sistemas");
    expect(grupoDe("/internal/operations/credit/products")).toBe("Operaciones");
    expect(navGroups.some((group) => group.label === "Crédito")).toBe(false);
  });

  it("una pestaña no pertenece a dos entradas", () => {
    const todas = navGroups.flatMap((group) =>
      group.items.flatMap((item) => item.tabs?.map((tab) => tab.href) ?? []),
    );
    expect(new Set(todas).size).toBe(todas.length);
  });

  it("el asistente nombra la pestaña en la que está la persona", () => {
    expect(assistScreenFor("/internal/operations/payment-claims")).toBe(
      "Operaciones › Cola de trabajo › Avisos de pago",
    );
    expect(assistScreenFor("/internal/merchant-users")).toBe(
      "Operaciones › Comercios › Usuarios",
    );
  });
});
