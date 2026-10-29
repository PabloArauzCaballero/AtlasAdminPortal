import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/operations/loans",
}));

const { Breadcrumbs } =
  await import("@/shared/components/layout/internal-shell/breadcrumbs");

/**
 * OBS-21: con `flex-wrap`, en 390 px la miga se partía en dos líneas y la barra superior recortaba
 * «Inicio». Ahora va en una línea; en pantallas estrechas se ven «Inicio» y el último tramo.
 */
describe("Breadcrumbs en pantallas estrechas", () => {
  it("no se parte en varias líneas y oculta los tramos intermedios por debajo de sm", () => {
    render(<Breadcrumbs />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav.className).toContain("flex-nowrap");
    expect(nav.className).not.toContain("flex-wrap");

    const tramos = nav.querySelectorAll(":scope > span");
    expect(tramos.length).toBe(2);
    expect(tramos[0].className).toContain("hidden");
    expect(tramos[0].className).toContain("sm:flex");
    expect(tramos[1].className).not.toContain("hidden");
    expect(screen.getByText("Inicio")).toBeInTheDocument();
  });
});
