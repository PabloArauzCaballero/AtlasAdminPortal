import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Las pantallas fusionadas dejan su ruta vieja como redirección, con sus parámetros: ningún
 * marcador ni enlace profundo termina en 404 ni en una pantalla vacía.
 */
const redirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect }));

const params = (value: Record<string, string>) => Promise.resolve(value);

describe("rutas retiradas", () => {
  beforeEach(() => redirect.mockClear());

  it("«Lineage oficial» lleva a la pestaña Grafo con su búsqueda", async () => {
    const { default: Page } =
      await import("@/app/internal/lineage/official/page");
    await Page({ searchParams: params({ q: "customers" }) });
    expect(redirect).toHaveBeenCalledWith(
      "/internal/lineage?q=customers&vista=grafo",
    );
  });

  it("«Impacto lineage» lleva a la pestaña Relaciones e impacto con sus filtros", async () => {
    const { default: Page } =
      await import("@/app/internal/lineage/impact/page");
    await Page({ searchParams: params({ severity: "CRITICAL" }) });
    expect(redirect).toHaveBeenCalledWith(
      "/internal/lineage?severity=CRITICAL&vista=impacto",
    );
  });

  it("el glosario lleva a la pestaña Términos de «Dominios y glosario»", async () => {
    const { default: Page } =
      await import("@/app/internal/business-metadata/glossary/page");
    await Page({ searchParams: params({ domain: "CREDIT" }) });
    expect(redirect).toHaveBeenCalledWith(
      "/internal/business-metadata/domains?domain=CREDIT&tab=terminos",
    );
  });

  it("el registro de datos personales lleva a su pestaña de Gobierno de datos", async () => {
    const { default: Page } =
      await import("@/app/internal/governance/pii/page");
    await Page({ searchParams: params({}) });
    expect(redirect).toHaveBeenCalledWith(
      "/internal/governance?tab=datos-personales",
    );
  });

  it("Exportaciones lleva al catálogo de datos, y cada exportación a la pantalla con su botón", async () => {
    const { default: List } = await import("@/app/internal/exports/page");
    List();
    expect(redirect).toHaveBeenLastCalledWith("/internal/data-catalog/tables");

    const { default: Detail } =
      await import("@/app/internal/exports/[exportId]/page");
    await Detail({
      params: Promise.resolve({ exportId: "export-data-quality" }),
    });
    expect(redirect).toHaveBeenLastCalledWith("/internal/data-quality/rules");
    await Detail({
      params: Promise.resolve({ exportId: "export-endpoint-catalog" }),
    });
    expect(redirect).toHaveBeenLastCalledWith("/internal/systems/endpoints");
    await Detail({ params: Promise.resolve({ exportId: "no-existe" }) });
    expect(redirect).toHaveBeenLastCalledWith("/internal/data-catalog/tables");
  });
});
