import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/shared/components/data-table/data-table";
import type { PaginationMeta } from "@/shared/api/types";

type Row = { name: string; score: number };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Nombre" },
  { accessorKey: "score", header: "Puntaje" },
];

// Los puntajes no colisionan con los contadores de la UI ("3", "42") para que
// una aserción por texto no matchee la celda equivocada.
const rows: Row[] = [
  { name: "Bravo", score: 20 },
  { name: "Alfa", score: 30 },
  { name: "Charlie", score: 10 },
];

function meta(overrides: Partial<PaginationMeta> = {}): PaginationMeta {
  return { page: 1, limit: 10, total: 42, totalPages: 5, ...overrides };
}

/** Nombres de la primera columna, en el orden en que se ven. */
function visibleNames() {
  return screen
    .getAllByRole("row")
    .slice(1) // la primera fila es la cabecera
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("DataTable · datos vacíos", () => {
  it("muestra el estado vacío en vez de una tabla sin filas", () => {
    render(<DataTable data={[]} columns={columns} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.getByText("No hay registros para mostrar."),
    ).toBeInTheDocument();
  });

  it("admite un título y una descripción propios del contexto", () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        emptyTitle="Sin issues abiertos"
        emptyDescription="Nada que revisar hoy."
      />,
    );

    expect(screen.getByText("Sin issues abiertos")).toBeInTheDocument();
    expect(screen.getByText("Nada que revisar hoy.")).toBeInTheDocument();
  });

  it("no pagina aunque le pasen meta: sin filas no hay nada que paginar", () => {
    render(<DataTable data={[]} columns={columns} meta={meta()} />);

    expect(
      screen.queryByRole("button", { name: "Siguiente" }),
    ).not.toBeInTheDocument();
  });
});

describe("DataTable · render de filas", () => {
  it("pinta una fila por registro", () => {
    render(<DataTable data={rows} columns={columns} />);

    expect(visibleNames()).toEqual(["Bravo", "Alfa", "Charlie"]);
  });

  it("sin meta, el contador muestra las filas que hay", () => {
    render(<DataTable data={rows} columns={columns} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("con meta, el contador muestra el total del servidor, no la página", () => {
    // Es la diferencia entre "3 registros" y "42 registros, ves 3".
    render(<DataTable data={rows} columns={columns} meta={meta()} />);

    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

describe("DataTable · orden", () => {
  it("ordena ascendente al pulsar la cabecera", async () => {
    render(<DataTable data={rows} columns={columns} />);

    await userEvent.click(screen.getByRole("button", { name: "Nombre" }));

    expect(visibleNames()).toEqual(["Alfa", "Bravo", "Charlie"]);
  });

  it("el segundo click invierte el orden", async () => {
    render(<DataTable data={rows} columns={columns} />);
    const header = screen.getByRole("button", { name: "Nombre" });

    await userEvent.click(header);
    await userEvent.click(header);

    expect(visibleNames()).toEqual(["Charlie", "Bravo", "Alfa"]);
  });

  it("ordenar por otra columna reemplaza el orden anterior, no lo acumula", async () => {
    // Nota: en columnas numéricas TanStack ordena descendente en el primer
    // click (`sortDescFirst`), de ahí 30/20/10. Lo que se fija aquí es que el
    // orden por "Nombre" desaparece, no que empiece ascendente.
    render(<DataTable data={rows} columns={columns} />);

    await userEvent.click(screen.getByRole("button", { name: "Nombre" }));
    await userEvent.click(screen.getByRole("button", { name: "Puntaje" }));

    expect(visibleNames()).toEqual(["Alfa", "Bravo", "Charlie"]);
  });
});

describe("DataTable · accesibilidad de cabeceras", () => {
  const mixedColumns: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "score", header: "Puntaje", enableSorting: false },
  ];

  function headerCell(name: string) {
    return screen
      .getAllByRole("columnheader")
      .find((th) => th.textContent === name);
  }

  it("una columna ordenable declara aria-sort='none' al inicio", () => {
    render(<DataTable data={rows} columns={columns} />);
    expect(headerCell("Nombre")).toHaveAttribute("aria-sort", "none");
  });

  it("aria-sort refleja el estado tras ordenar", async () => {
    render(<DataTable data={rows} columns={columns} />);
    await userEvent.click(screen.getByRole("button", { name: "Nombre" }));
    expect(headerCell("Nombre")).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(screen.getByRole("button", { name: "Nombre" }));
    expect(headerCell("Nombre")).toHaveAttribute("aria-sort", "descending");
  });

  it("una columna NO ordenable no declara aria-sort ni renderiza un botón", () => {
    render(<DataTable data={rows} columns={mixedColumns} />);
    const puntaje = headerCell("Puntaje");
    expect(puntaje).not.toHaveAttribute("aria-sort");
    // El botón sin acción era la trampa para lectores de pantalla: no debe existir.
    expect(
      screen.queryByRole("button", { name: "Puntaje" }),
    ).not.toBeInTheDocument();
  });

  it("la columna ordenable de la misma tabla sí conserva su botón", () => {
    render(<DataTable data={rows} columns={mixedColumns} />);
    expect(screen.getByRole("button", { name: "Nombre" })).toBeInTheDocument();
  });
});

describe("DataTable · paginación", () => {
  it("sin meta no hay controles de paginación", () => {
    render(<DataTable data={rows} columns={columns} />);

    expect(
      screen.queryByRole("button", { name: "Siguiente" }),
    ).not.toBeInTheDocument();
  });

  it("con meta muestra la página actual sobre el total", () => {
    render(
      <DataTable data={rows} columns={columns} meta={meta({ page: 2 })} />,
    );

    expect(
      screen.getByText(/Página 2 de 5 · 42 registros/),
    ).toBeInTheDocument();
  });

  it("las páginas son 1-indexadas: 'Siguiente' desde la 1 pide la 2", async () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={rows}
        columns={columns}
        meta={meta()}
        onPageChange={onPageChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("'Anterior' pide la página previa", async () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={rows}
        columns={columns}
        meta={meta({ page: 3 })}
        onPageChange={onPageChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("en la primera página no se puede retroceder (no hay página 0)", () => {
    render(
      <DataTable data={rows} columns={columns} meta={meta({ page: 1 })} />,
    );

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  });

  it("en la última página no se puede avanzar", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        meta={meta({ page: 5, totalPages: 5 })}
      />,
    );

    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("con una sola página ambos controles están deshabilitados", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        meta={meta({ page: 1, total: 3, totalPages: 1 })}
      />,
    );

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("totalPages=0 se muestra como 'de 1', no como 'de 0'", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        meta={meta({ page: 1, totalPages: 0 })}
      />,
    );

    expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument();
  });

  it("sin onPageChange, pulsar no revienta", async () => {
    render(<DataTable data={rows} columns={columns} meta={meta()} />);

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
