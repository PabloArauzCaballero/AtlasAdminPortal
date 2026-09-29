import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
  usePathname: () => "/internal/lineage",
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), prefetch: vi.fn() }),
}));

const { UrlTabs } = await import("@/shared/components/layout/url-tabs");

const TABS = [
  { value: "grafo", label: "Grafo" },
  { value: "impacto", label: "Relaciones e impacto" },
];

describe("UrlTabs — la pestaña vive en la URL", () => {
  beforeEach(() => {
    nav.replace.mockClear();
    nav.params = new URLSearchParams();
  });

  it("sin parámetro, o con uno desconocido, la primera pestaña está activa", () => {
    nav.params = new URLSearchParams("vista=inexistente");
    render(<UrlTabs param="vista" tabs={TABS} label="Vistas" />);
    expect(screen.getByRole("tab", { name: "Grafo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("marca la pestaña de la URL", () => {
    nav.params = new URLSearchParams("vista=impacto");
    render(<UrlTabs param="vista" tabs={TABS} label="Vistas" />);
    expect(
      screen.getByRole("tab", { name: "Relaciones e impacto" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("al cambiar conserva los demás parámetros y descarta la página de la pestaña anterior", () => {
    nav.params = new URLSearchParams("q=loans&page=3");
    render(<UrlTabs param="vista" tabs={TABS} label="Vistas" />);
    fireEvent.click(screen.getByRole("tab", { name: "Relaciones e impacto" }));
    expect(nav.replace).toHaveBeenCalledWith(
      "/internal/lineage?q=loans&vista=impacto",
      {
        scroll: false,
      },
    );
  });

  it("se maneja con el teclado: la flecha derecha pasa a la siguiente", () => {
    render(<UrlTabs param="vista" tabs={TABS} label="Vistas" />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Grafo" }), {
      key: "ArrowRight",
    });
    expect(nav.replace).toHaveBeenCalledWith(
      "/internal/lineage?vista=impacto",
      { scroll: false },
    );
  });
});
