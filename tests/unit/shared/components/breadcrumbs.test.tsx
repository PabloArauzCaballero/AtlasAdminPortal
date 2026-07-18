import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs } from "@/shared/components/layout/internal-shell/breadcrumbs";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname }));

function renderAt(pathname: string) {
  usePathname.mockReturnValue(pathname);
  return render(<Breadcrumbs />);
}

/** Migas visibles, sin los separadores "/". */
function crumbs() {
  return screen
    .getByRole("navigation", { name: "Breadcrumb" })
    .textContent?.split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

describe("Breadcrumbs · raíz", () => {
  it("en /internal no hay nav, solo 'Inicio'", () => {
    renderAt("/internal");

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("la barra final no inventa una miga vacía", () => {
    renderAt("/internal/");

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("Breadcrumbs · rutas", () => {
  it("se anuncia como navegación de migas", () => {
    renderAt("/internal/audit");

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument();
  });

  it("traduce los segmentos conocidos a etiquetas de negocio", () => {
    renderAt("/internal/data-quality/issues");

    expect(crumbs()).toEqual(["Inicio", "Calidad de datos", "Issues"]);
  });

  it("un segmento sin traducción se muestra crudo en vez de desaparecer", () => {
    // Los ids de recurso (uuid, códigos) no están en el diccionario; perderlos
    // dejaría la miga incompleta.
    renderAt("/internal/audit/9f3a-11ee");

    expect(crumbs()).toEqual(["Inicio", "Auditoría", "9f3a-11ee"]);
  });

  it("'Inicio' enlaza al home interno", () => {
    renderAt("/internal/audit");

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "href",
      "/internal",
    );
  });

  it("solo 'Inicio' es enlace: la ruta actual no se enlaza a sí misma", () => {
    renderAt("/internal/data-quality/issues");

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("descarta el primer segmento (/internal) y no lo pinta como miga", () => {
    renderAt("/internal/qa/lab");

    expect(crumbs()).not.toContain("internal");
  });

  it("aguanta rutas profundas manteniendo el orden", () => {
    renderAt("/internal/qa/lab/runs/42");

    expect(crumbs()).toEqual([
      "Inicio",
      "QA",
      "Laboratorio",
      "Ejecuciones",
      "42",
    ]);
  });

  it("segmentos repetidos no se colapsan", () => {
    // La key de React es `${segment}-${index}`; si fuese solo el segmento,
    // React tiraría un warning y podría reutilizar nodos mal.
    renderAt("/internal/versions/versions");

    expect(crumbs()).toEqual(["Inicio", "Versiones", "Versiones"]);
  });
});
