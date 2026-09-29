import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogItemDetailDrawer } from "@/features/operations/catalog-item-detail-drawer";
import type { ContextItem } from "@/features/operations/catalog-version-types";

const ITEM: ContextItem = {
  contextItemId: "5",
  itemCode: "BNB",
  itemName: "Banco Nacional de Bolivia",
  itemType: "bank",
  attributes: {},
  sourceId: null,
  confidenceScore: "90",
  isActive: true,
  aliases: [
    {
      aliasId: "1",
      aliasValue: "BNB S.A.",
      aliasType: "sigla",
      normalizedAlias: "bnb sa",
      confidenceScore: "85.5",
    },
  ],
  riskMappings: [
    {
      riskMappingId: "2",
      riskDimension: "identity",
      riskBand: "high",
      scorePointsSuggested: "-12.5",
      reasonCode: "BLACKLISTED_ENTITY",
      explanation: "Entidad en lista negra",
      modelUsage: "scoring",
      validFrom: null,
      validUntil: null,
    },
  ],
};

/** Alias y mapeos de riesgo de un item: registros del mismo tipo, con cabeceras y no tarjetas. */
describe("CatalogItemDetailDrawer", () => {
  it("pinta alias y mapeos de riesgo como tablas", () => {
    render(<CatalogItemDetailDrawer item={ITEM} onClose={vi.fn()} />);
    const [alias, mapeos] = screen.getAllByRole("table");
    expect(
      within(alias)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(
      expect.arrayContaining(["Valor", "Tipo", "Normalizado", "Confianza"]),
    );
    expect(within(alias).getByText("BNB S.A.")).toBeInTheDocument();
    expect(
      within(mapeos)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(
      expect.arrayContaining([
        "Dimensión",
        "Banda",
        "Puntos",
        "Motivo",
        "Vigencia",
      ]),
    );
    expect(within(mapeos).getByText("BLACKLISTED_ENTITY")).toBeInTheDocument();
    expect(within(mapeos).getByText("-12.5 pts")).toBeInTheDocument();
  });

  it("un item sin alias ni mapeos lo dice en vez de dejar el hueco", () => {
    render(
      <CatalogItemDetailDrawer
        item={{ ...ITEM, aliases: [], riskMappings: [] }}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText("El elemento no tiene alias registrados."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El elemento no tiene mapeos de riesgo."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
