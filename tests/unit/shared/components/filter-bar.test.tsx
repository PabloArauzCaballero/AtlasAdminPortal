import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FilterBar,
  type FilterOption,
} from "@/shared/components/data-table/filter-bar";

const estadoFilter: FilterOption = {
  name: "estado",
  label: "Estado",
  value: "",
  options: [
    { label: "Abierto", value: "OPEN" },
    { label: "Cerrado", value: "CLOSED" },
  ],
};

describe("FilterBar · búsqueda", () => {
  it("el buscador es un campo controlado que refleja el valor recibido", () => {
    render(<FilterBar search="factura" onSearchChange={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveValue("factura");
  });

  it("emite cada tecla al padre (el debounce vive fuera)", async () => {
    const onSearchChange = vi.fn();
    render(<FilterBar search="" onSearchChange={onSearchChange} />);

    await userEvent.type(screen.getByRole("textbox"), "ab");

    expect(onSearchChange).toHaveBeenCalledTimes(2);
    expect(onSearchChange).toHaveBeenLastCalledWith("b");
  });

  it("usa el placeholder por defecto y admite uno propio", () => {
    const { unmount } = render(
      <FilterBar search="" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText("Buscar…")).toBeInTheDocument();
    unmount();

    render(
      <FilterBar
        search=""
        searchPlaceholder="Buscar por RUC"
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Buscar por RUC")).toBeInTheDocument();
  });
});

describe("FilterBar · filtros", () => {
  it("sin filtros solo hay buscador", () => {
    render(<FilterBar search="" onSearchChange={vi.fn()} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("cada filtro ofrece sus opciones más la de 'sin filtrar'", () => {
    render(
      <FilterBar search="" filters={[estadoFilter]} onSearchChange={vi.fn()} />,
    );

    const select = screen.getByRole("combobox");
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Estado", "Abierto", "Cerrado"]);
  });

  it("la opción 'sin filtrar' tiene value vacío, no la etiqueta", () => {
    // Si el placeholder llevase value="Estado", el listado filtraría por un
    // estado inexistente al arrancar.
    render(
      <FilterBar search="" filters={[estadoFilter]} onSearchChange={vi.fn()} />,
    );

    expect(screen.getByRole("option", { name: "Estado" })).toHaveValue("");
  });

  it("emite el nombre del filtro junto al valor elegido", async () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        search=""
        filters={[estadoFilter]}
        onSearchChange={vi.fn()}
        onFilterChange={onFilterChange}
      />,
    );

    await userEvent.selectOptions(screen.getByRole("combobox"), "CLOSED");

    expect(onFilterChange).toHaveBeenCalledWith("estado", "CLOSED");
  });

  it("volver a la opción vacía emite '' (así se quita el filtro)", async () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        search=""
        filters={[{ ...estadoFilter, value: "OPEN" }]}
        onSearchChange={vi.fn()}
        onFilterChange={onFilterChange}
      />,
    );

    await userEvent.selectOptions(screen.getByRole("combobox"), "");

    expect(onFilterChange).toHaveBeenCalledWith("estado", "");
  });

  it("renderiza un select por filtro", () => {
    render(
      <FilterBar
        search=""
        filters={[
          estadoFilter,
          { ...estadoFilter, name: "modulo", label: "Módulo" },
        ]}
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("sin onFilterChange, cambiar el select no revienta", async () => {
    render(
      <FilterBar search="" filters={[estadoFilter]} onSearchChange={vi.fn()} />,
    );

    await userEvent.selectOptions(screen.getByRole("combobox"), "OPEN");

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});

describe("FilterBar · limpiar", () => {
  it("sin onClear no se ofrece el botón (nada que limpiar)", () => {
    render(<FilterBar search="algo" onSearchChange={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Limpiar" }),
    ).not.toBeInTheDocument();
  });

  it("con onClear, pulsar Limpiar lo invoca", async () => {
    const onClear = vi.fn();
    render(
      <FilterBar search="algo" onSearchChange={vi.fn()} onClear={onClear} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
