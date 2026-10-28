import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FilterBar,
  type FilterOption,
} from "@/shared/components/data-table/filter-bar";

const FILTROS: FilterOption[] = [
  {
    name: "estado",
    label: "Estado",
    value: "",
    options: [{ label: "Abierto", value: "OPEN" }],
  },
  {
    name: "canal",
    label: "Canal",
    value: "",
    options: [{ label: "Correo", value: "EMAIL" }],
  },
];

describe("FilterBar · filtros plegables en móvil", () => {
  it("con filtros ofrece un botón «Filtros», plegado, que controla el panel", () => {
    render(<FilterBar search="" filters={FILTROS} onSearchChange={vi.fn()} />);

    const boton = screen.getByRole("button", { name: "Filtros" });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(
      boton.getAttribute("aria-controls") ?? "",
    );
    expect(panel).not.toBeNull();
    expect(panel).toHaveClass("hidden");
    // El botón solo existe por debajo de lg: en escritorio los filtros están siempre a la vista.
    expect(boton).toHaveClass("lg:hidden");
    expect(panel).toHaveClass("lg:contents");
  });

  it("pulsarlo despliega el panel y lo anuncia con aria-expanded", async () => {
    const user = userEvent.setup();
    render(<FilterBar search="" filters={FILTROS} onSearchChange={vi.fn()} />);

    const boton = screen.getByRole("button", { name: "Filtros" });
    await user.click(boton);

    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(
      document.getElementById(boton.getAttribute("aria-controls") ?? ""),
    ).not.toHaveClass("hidden");

    await user.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "false");
  });

  it("el botón dice cuántos filtros hay activos, también por texto accesible", () => {
    render(
      <FilterBar
        search=""
        filters={[{ ...FILTROS[0], value: "OPEN" }, FILTROS[1]]}
        onSearchChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Filtros: 1 activos" }),
    ).toBeInTheDocument();
  });

  it("sin filtros no hay botón: solo el buscador", () => {
    render(<FilterBar search="" onSearchChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /Filtros/ })).toBeNull();
    expect(
      screen.getByRole("textbox", { name: "Buscar…" }),
    ).toBeInTheDocument();
  });

  it("«Limpiar» vive dentro del panel y sigue llamando a onClear", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <FilterBar
        search=""
        filters={FILTROS}
        onSearchChange={vi.fn()}
        onClear={onClear}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Limpiar/ }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("el buscador con ayuda reserva espacio para el ⓘ y no escribe debajo de él", () => {
    render(
      <FilterBar
        search=""
        searchTooltip="Busca por título."
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Buscar…" })).toHaveClass(
      "pr-10",
    );
  });
});
