import { render, screen } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { DataTable } from "@/shared/components/data-table/data-table";

type Fila = { code: string };
const COLUMNAS: ColumnDef<Fila>[] = [{ header: "Código", accessorKey: "code" }];

describe("DataTable · región desplazable accesible", () => {
  it("la región con scroll se enfoca con el teclado y tiene nombre (axe: scrollable-region-focusable)", () => {
    render(<DataTable data={[{ code: "A1" }]} columns={COLUMNAS} />);
    const region = screen.getByRole("region", { name: "Tabla de registros" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toContainElement(screen.getByRole("table"));
    region.focus();
    expect(region).toHaveFocus();
  });
});
