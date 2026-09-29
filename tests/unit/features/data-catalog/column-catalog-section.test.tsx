import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataEntityColumn } from "@/features/systems/types";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";

const sesion = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: sesion.permissions,
    hasPermission: (permiso: string) => sesion.permissions.includes(permiso),
  }),
}));

import { ColumnCatalogSection } from "@/features/data-catalog/detail/column-catalog-section";

const COLUMNAS: DataEntityColumn[] = [
  {
    columnId: "1",
    columnName: "document_number",
    dataType: "text",
    containsPii: true,
    usedInMl: false,
    isNullable: false,
    businessDescription: "Número del documento de identidad.",
    reviewStatus: "APPROVED",
  },
  {
    columnId: "2",
    columnName: "created_at",
    dataType: "timestamptz",
    containsPii: false,
    usedInMl: true,
    isNullable: false,
    reviewStatus: "NEEDS_REVIEW",
  },
  {
    columnId: "3",
    columnName: "notes",
    dataType: "text",
    containsPii: false,
    usedInMl: false,
    isNullable: true,
  },
];

const filas = () => within(screen.getByRole("table")).getAllByRole("row");

describe("Columnas de una tabla del catálogo", () => {
  beforeEach(() => {
    sesion.permissions = [];
  });

  it("son una tabla con cabeceras, no tarjetas sueltas", () => {
    renderWithProviders(<ColumnCatalogSection columns={COLUMNAS} />);
    const tabla = screen.getByRole("table");
    for (const cabecera of [
      "Columna",
      "Tipo",
      "Descripción",
      "Datos personales",
      "Uso ML",
      "Revisión",
      "Acciones",
    ]) {
      expect(
        within(tabla).getByRole("columnheader", { name: cabecera }),
      ).toBeInTheDocument();
    }
    expect(filas()).toHaveLength(4);
    expect(
      within(tabla).getAllByText("Sin descripción registrada."),
    ).toHaveLength(2);
  });

  it("el buscador y los filtros recortan las filas, y sin coincidencias lo dicen", async () => {
    renderWithProviders(<ColumnCatalogSection columns={COLUMNAS} />);
    fireEvent.change(screen.getByRole("textbox", { name: /Buscar columna/ }), {
      target: { value: "documento" },
    });
    await waitFor(() => expect(filas()).toHaveLength(2));
    fireEvent.change(screen.getByRole("textbox", { name: /Buscar columna/ }), {
      target: { value: "" },
    });
    await waitFor(() => expect(filas()).toHaveLength(4));
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Uso ML/ }),
      "yes",
    );
    await waitFor(() => expect(filas()).toHaveLength(2));
    expect(
      within(screen.getByRole("table")).getByText("created_at"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /Buscar columna/ }), {
      target: { value: "zzz" },
    });
    expect(
      await screen.findByText("Ninguna columna coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("sin columnas del servidor dice que el catálogo está pendiente", () => {
    renderWithProviders(<ColumnCatalogSection columns={[]} />);
    expect(
      screen.getByText("Catálogo de columnas pendiente."),
    ).toBeInTheDocument();
  });

  it("«Revisar» sólo aparece con permiso y en columnas con id", () => {
    const { unmount } = renderWithProviders(
      <ColumnCatalogSection columns={COLUMNAS} />,
    );
    expect(screen.queryByRole("button", { name: "Revisar" })).toBeNull();
    unmount();
    sesion.permissions = ["systems.reviewQueue.resolve"];
    renderWithProviders(
      <ColumnCatalogSection
        columns={[...COLUMNAS, { columnName: "sin_id" }]}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Revisar" })).toHaveLength(3);
  });
});
