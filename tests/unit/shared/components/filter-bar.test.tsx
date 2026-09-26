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
  tooltip:
    "Acota la tabla al momento del caso; en «Abierto» está lo que nadie ha tomado.",
  options: [
    {
      label: "Abierto",
      value: "OPEN",
      description: "Nadie lo ha tomado todavía; sigue esperando a un analista.",
    },
    {
      label: "Cerrado",
      value: "CLOSED",
      description: "Ya tiene desenlace y no admite más acciones.",
    },
  ],
};

/** Abre el desplegable de un filtro por su nombre accesible. */
const abrir = async (nombre: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: nombre }));
};

describe("FilterBar · búsqueda", () => {
  it("el buscador es un campo controlado que refleja el valor recibido", () => {
    render(<FilterBar search="factura" onSearchChange={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Buscar…" })).toHaveValue(
      "factura",
    );
  });

  it("emite cada tecla al padre (el debounce vive fuera)", async () => {
    const onSearchChange = vi.fn();
    render(<FilterBar search="" onSearchChange={onSearchChange} />);

    await userEvent.type(
      screen.getByRole("textbox", { name: "Buscar…" }),
      "ab",
    );

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

  it("cada filtro ofrece sus opciones más la de 'sin filtrar'", async () => {
    render(
      <FilterBar search="" filters={[estadoFilter]} onSearchChange={vi.fn()} />,
    );

    await abrir("Estado");

    expect(
      within(screen.getByRole("listbox"))
        .getAllByRole("option")
        .map((option) => option.querySelector("span")?.textContent),
    ).toEqual(["Estado", "Abierto", "Cerrado"]);
  });

  it("cada opción enseña qué significa, no sólo su código", async () => {
    render(
      <FilterBar search="" filters={[estadoFilter]} onSearchChange={vi.fn()} />,
    );

    await abrir("Estado");

    expect(
      screen.getByText(
        "Nadie lo ha tomado todavía; sigue esperando a un analista.",
      ),
    ).toBeInTheDocument();
  });

  it("el filtro lleva su propia ayuda, fuera del nombre accesible del control", async () => {
    render(
      <FilterBar search="" filters={[estadoFilter]} onSearchChange={vi.fn()} />,
    );

    const ayuda = screen.getByRole("button", { name: "Ayuda: Estado" });
    await userEvent.hover(ayuda);

    expect(screen.getByRole("tooltip")).toHaveTextContent("Acota la tabla");
    // El control sigue llamándose «Estado» a secas: los getByLabel existentes no cambian.
    expect(
      screen.getByRole("combobox", { name: "Estado" }),
    ).toBeInTheDocument();
  });

  it("la opción 'sin filtrar' tiene value vacío, no la etiqueta", async () => {
    // Si el placeholder llevase value="Estado", el listado filtraría por un
    // estado inexistente al arrancar.
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        search=""
        filters={[{ ...estadoFilter, value: "OPEN" }]}
        onSearchChange={vi.fn()}
        onFilterChange={onFilterChange}
      />,
    );

    await abrir("Estado");
    await userEvent.click(screen.getByTestId("select-estado-option-"));

    expect(onFilterChange).toHaveBeenCalledWith("estado", "");
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

    await abrir("Estado");
    await userEvent.click(screen.getByTestId("select-estado-option-CLOSED"));

    expect(onFilterChange).toHaveBeenCalledWith("estado", "CLOSED");
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

  it("sin onFilterChange, elegir no revienta", async () => {
    render(
      <FilterBar search="" filters={[estadoFilter]} onSearchChange={vi.fn()} />,
    );

    await abrir("Estado");
    await userEvent.click(screen.getByTestId("select-estado-option-OPEN"));

    expect(
      screen.getByRole("combobox", { name: "Estado" }),
    ).toBeInTheDocument();
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
