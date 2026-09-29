import { describe, expect, it } from "vitest";
import { facetValues } from "@/features/governed-views/facets";
import { GOVERNED_VIEWS } from "@/features/governed-views/types";

describe("facetValues", () => {
  it("en «Clientes» lee lifecycleStatus y latestRiskBand, que es lo que trae la fila", () => {
    const clientes = GOVERNED_VIEWS.find((v) => v.key === "customers")!;
    const fila = { lifecycleStatus: "registered", latestRiskBand: "B" };
    const estado = clientes.filters.find((f) => f.name === "status")!;
    const banda = clientes.filters.find((f) => f.name === "riskBand")!;
    expect(facetValues([fila], estado)).toEqual(["registered"]);
    expect(facetValues([fila], banda)).toEqual(["B"]);
  });

  it("sin `field` usa el nombre del filtro", () => {
    expect(
      facetValues([{ status: "open" }, { status: null }], {
        name: "status",
        label: "Estado",
        kind: "facet",
      }),
    ).toEqual(["open", null]);
  });
});
