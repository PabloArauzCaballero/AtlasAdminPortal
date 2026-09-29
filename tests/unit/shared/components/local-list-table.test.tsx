import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import {
  LocalListTable,
  normalizeSearch,
} from "@/shared/components/data-table/local-list-table";
import {
  buscar,
  cabeceras,
  esperarFilas,
  esTablaHomogenea,
  filasDeDatos,
  filtrarPor,
} from "../tabla-helpers";

type Fila = { code: string; name: string; state: "ok" | "falla" };

const FILAS: Fila[] = [
  { code: "A1", name: "Aprobación", state: "ok" },
  { code: "B2", name: "Cobranza", state: "falla" },
  { code: "C3", name: "Riesgo", state: "ok" },
];

const COLUMNAS: ColumnDef<Fila>[] = [
  { header: "Código", accessorKey: "code" },
  { header: "Nombre", accessorKey: "name" },
  { header: "Estado", accessorKey: "state" },
];

function montar(rows: Fila[] = FILAS) {
  return render(
    <LocalListTable
      rows={rows}
      columns={COLUMNAS}
      searchText={(fila) => `${fila.code} ${fila.name}`}
      searchPlaceholder="Buscar por código o nombre…"
      searchTooltip="Recorre todas las filas, que llegan enteras."
      filters={[
        {
          name: "state",
          label: "Estado",
          tooltip: "Deja sólo las filas con ese estado.",
          options: [
            { value: "ok", label: "Bien", description: "Las que están bien." },
            { value: "falla", label: "Mal", description: "Las que fallan." },
          ],
          test: (fila, valor) => fila.state === valor,
        },
      ]}
      emptyTitle="No hay filas."
      emptyFilteredTitle="Ninguna fila coincide."
    />,
  );
}

describe("LocalListTable · el formato homogéneo de un catálogo cerrado", () => {
  it("pinta tabla con cabeceras, buscador con ⓘ, filtro y Limpiar", () => {
    montar();
    esTablaHomogenea(["Código", "Nombre", "Estado"], /Buscar por código/);
    expect(filasDeDatos()).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: /Buscar por código o nombre/ }),
    ).toBeInTheDocument();
    expect(cabeceras()).not.toContain("Registros");
  });

  it("el buscador recorta las filas sin distinguir mayúsculas ni tildes", async () => {
    montar();
    await buscar(/Buscar por código/, "APROBACION");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("A1");
  });

  it("el filtro recorta y Limpiar devuelve todas", async () => {
    montar();
    await filtrarPor(/^Estado/, "falla");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("B2");
    await userEvent.click(screen.getByRole("button", { name: /limpiar/i }));
    await esperarFilas(3);
  });

  it("dice «nada coincide» distinto de «no hay datos»", async () => {
    montar();
    await buscar(/Buscar por código/, "zzz");
    expect(
      await screen.findByText("Ninguna fila coincide."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("sin filas dice «no hay datos»", () => {
    montar([]);
    expect(screen.getByText("No hay filas.")).toBeInTheDocument();
  });

  it("normalizeSearch quita tildes y mayúsculas", () => {
    expect(normalizeSearch("  ÁÉÍÓÚ Ñandú ")).toBe("aeiou nandu");
  });
});
