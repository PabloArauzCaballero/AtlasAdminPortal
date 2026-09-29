import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogVersionItemsTable } from "@/features/operations/catalog-version-items-table";
import { buildCatalogVersionItemColumns } from "@/features/operations/catalog-version-items-columns";
import type { ContextItem } from "@/features/operations/catalog-version-types";
import { elegirOpcion } from "../../shared/option-select-helpers";

const item = (codigo: string, nombre: string, activo = true): ContextItem => ({
  contextItemId: codigo,
  itemCode: codigo,
  itemName: nombre,
  itemType: "bank",
  attributes: {},
  sourceId: null,
  confidenceScore: null,
  isActive: activo,
  aliases: [],
  riskMappings: [],
});

const ITEMS = [
  item("BNB", "Banco Nacional"),
  item("BME", "Banco Mercantil"),
  item("VIEJO", "Entidad antigua", false),
];

/** Los items de una versión: una tabla con buscador y filtro sobre la versión ENTERA. */
describe("CatalogVersionItemsTable", () => {
  const columnas = buildCatalogVersionItemColumns(vi.fn());

  it("tiene cabeceras, buscador y filtro de estado que recortan filas", async () => {
    render(<CatalogVersionItemsTable items={ITEMS} columns={columnas} />);
    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(expect.arrayContaining(["Código", "Nombre", "Tipo"]));

    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Buscar por código, nombre o tipo del elemento…",
      }),
      "mercantil",
    );
    await waitFor(() => expect(screen.queryByText("BNB")).toBeNull());
    expect(screen.getByText("BME")).toBeInTheDocument();
  });

  it("el filtro de estado deja sólo los inactivos", async () => {
    render(<CatalogVersionItemsTable items={ITEMS} columns={columnas} />);
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Activo/ }),
      "false",
    );
    await waitFor(() => expect(screen.queryByText("BNB")).toBeNull());
    expect(screen.getByText("VIEJO")).toBeInTheDocument();
  });

  it("distingue «no hay items» de «nada coincide»", async () => {
    const { unmount } = render(
      <CatalogVersionItemsTable items={[]} columns={columnas} />,
    );
    expect(
      screen.getByText("Esta versión no tiene elementos."),
    ).toBeInTheDocument();
    unmount();
    render(<CatalogVersionItemsTable items={ITEMS} columns={columnas} />);
    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Buscar por código, nombre o tipo del elemento…",
      }),
      "zzzz",
    );
    expect(
      await screen.findByText("Ningún elemento coincide con los filtros."),
    ).toBeInTheDocument();
  });
});
