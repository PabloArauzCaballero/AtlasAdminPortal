import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/shared/components/data-table/data-table";

type Row = { name: string };
const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Nombre" }];
const muchas: Row[] = Array.from({ length: 60 }, (_, i) => ({
  name: `Fila ${i + 1}`,
}));

describe("DataTable · paginación", () => {
  it("parte en el cliente una tabla que llegó entera y deja navegar", async () => {
    const user = userEvent.setup();
    render(<DataTable data={muchas} columns={columns} />);

    expect(screen.getAllByRole("row")).toHaveLength(26); // cabecera + 25
    expect(screen.getByText(/Página 1 de 3 · 60 registros/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText("Fila 26")).toBeVisible();
    expect(screen.queryByText("Fila 1")).not.toBeInTheDocument();
  });

  it("va directo a la página pedida y acota lo que se pasa del total", async () => {
    const user = userEvent.setup();
    render(<DataTable data={muchas} columns={columns} />);

    const campo = screen.getByRole("spinbutton", { name: "Número de página" });
    await user.clear(campo);
    await user.type(campo, "99{Enter}");

    expect(screen.getByText(/Página 3 de 3/)).toBeVisible();
    expect(screen.getByText("Fila 60")).toBeVisible();
  });

  it("no pone pie a una tabla corta", () => {
    render(<DataTable data={muchas.slice(0, 5)} columns={columns} />);
    expect(screen.queryByText(/Página 1 de/)).not.toBeInTheDocument();
  });

  it("con meta del servidor ofrece ir a la página y filas por página", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={muchas.slice(0, 10)}
        columns={columns}
        meta={{ page: 2, limit: 10, total: 60, totalPages: 6 }}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText("Filas por página")).toBeVisible();

    const campo = screen.getByRole("spinbutton", { name: "Número de página" });
    await user.clear(campo);
    await user.type(campo, "5{Enter}");
    expect(onPageChange).toHaveBeenCalledWith(5);

    await user.click(screen.getByRole("button", { name: /Anterior/ }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      11,
    );
  });
});
