import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SchemaInventoryMissingNote } from "@/features/schema-management/schema-inventory-missing-note";
import { renderWithProviders } from "../../helpers/render-with-providers";

describe("SchemaInventoryMissingNote", () => {
  it("dice qué versión no tiene inventario y manda al catálogo de datos", () => {
    renderWithProviders(<SchemaInventoryMissingNote versionCodes={["v1.0"]} />);
    expect(
      screen.getByText("Sin inventario de tablas: v1.0"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir el catálogo de datos" }),
    ).toHaveAttribute("href", "/internal/data-catalog/tables");
  });

  it("no aparece si todas las versiones tienen tablas", () => {
    renderWithProviders(<SchemaInventoryMissingNote versionCodes={[]} />);
    expect(screen.queryByTestId("schema-inventory-missing")).toBeNull();
  });
});
