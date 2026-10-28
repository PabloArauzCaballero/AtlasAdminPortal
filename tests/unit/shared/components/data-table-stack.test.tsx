import { render, screen, within } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { DataTable } from "@/shared/components/data-table/data-table";

type Fila = { id: string; canal: string; estado: string };

const COLUMNAS: ColumnDef<Fila>[] = [
  { header: "Código", accessorKey: "id" },
  { header: "Canal", accessorKey: "canal" },
  { header: "Estado", accessorKey: "estado" },
  // Sin cabecera de texto: es la acción de la fila.
  { id: "acciones", cell: () => <button type="button">Abrir</button> },
];

const DATOS: Fila[] = [
  { id: "A1", canal: "EMAIL", estado: "Leída" },
  { id: "B2", canal: "IN_APP", estado: "Pendiente" },
];

function columnasAncha(n: number): ColumnDef<Fila>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    header: `Col ${i}`,
    cell: () => "x",
  }));
}

describe("DataTable · modo apilado en móvil", () => {
  it("se activa por defecto con pocas columnas y pone la etiqueta de la cabecera en cada celda", () => {
    render(<DataTable data={DATOS} columns={COLUMNAS} />);

    expect(screen.getByRole("table")).toHaveClass("atlas-stack");
    const fila = screen.getAllByRole("row")[1];
    const celdas = within(fila).getAllByRole("cell");
    expect(celdas[0]).toHaveAttribute("data-label", "Código");
    expect(celdas[1]).toHaveAttribute("data-label", "Canal");
    expect(celdas[2]).toHaveAttribute("data-label", "Estado");
  });

  it("la celda de acción no lleva etiqueta y su botón sigue en el DOM", () => {
    render(<DataTable data={DATOS} columns={COLUMNAS} />);

    const fila = screen.getAllByRole("row")[1];
    const accion = within(fila).getAllByRole("cell")[3];
    expect(accion).toHaveAttribute("data-label", "");
    expect(
      within(accion).getByRole("button", { name: "Abrir" }),
    ).toBeInTheDocument();
  });

  it("repite los roles de tabla explícitos: display:block los quita en algunos navegadores", () => {
    render(<DataTable data={DATOS} columns={COLUMNAS} />);

    expect(screen.getByRole("table")).toHaveAttribute("role", "table");
    expect(screen.getAllByRole("rowgroup").length).toBe(2);
    expect(screen.getAllByRole("columnheader")).toHaveLength(4);
  });

  it("la región desplazable pierde su altura máxima en móvil al apilar", () => {
    render(<DataTable data={DATOS} columns={COLUMNAS} />);

    expect(
      screen.getByRole("region", { name: "Tabla de registros" }),
    ).toHaveClass("atlas-stack-region");
  });

  it("con más de 8 columnas NO apila: una tarjeta sería más larga que desplazar", () => {
    render(<DataTable data={DATOS} columns={columnasAncha(9)} />);

    expect(screen.getByRole("table")).not.toHaveClass("atlas-stack");
    expect(
      screen.getByRole("region", { name: "Tabla de registros" }),
    ).not.toHaveClass("atlas-stack-region");
  });

  it("con exactamente 8 columnas sí apila (borde del umbral)", () => {
    render(<DataTable data={DATOS} columns={columnasAncha(8)} />);

    expect(screen.getByRole("table")).toHaveClass("atlas-stack");
  });

  it("`stack={false}` lo apaga aunque haya pocas columnas", () => {
    render(<DataTable data={DATOS} columns={COLUMNAS} stack={false} />);

    expect(screen.getByRole("table")).not.toHaveClass("atlas-stack");
    expect(screen.getByRole("table")).not.toHaveAttribute("role");
  });

  it("`stack` a secas lo fuerza con muchas columnas", () => {
    render(<DataTable data={DATOS} columns={columnasAncha(12)} stack />);

    expect(screen.getByRole("table")).toHaveClass("atlas-stack");
  });

  it("una cabecera que no es texto no inventa etiqueta", () => {
    const columnas: ColumnDef<Fila>[] = [
      { header: () => <span>Dinámica</span>, accessorKey: "id" },
    ];
    render(<DataTable data={DATOS} columns={columnas} />);

    const celda = within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0];
    expect(celda).toHaveAttribute("data-label", "");
  });
});
