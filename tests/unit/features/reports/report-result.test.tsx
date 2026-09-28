import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportResult } from "@/features/reports/report-result";
import { filledFilters } from "@/features/reports/report-filters-form";

/**
 * El informe se enseñaba como JSON crudo y los cuatro informes devolvían lo mismo. Ahora cada
 * apartado llega calculado como líneas etiqueta/valor y así se pinta.
 */
describe("ReportResult", () => {
  it("pinta cada apartado como líneas etiqueta — valor con números formateados", () => {
    render(
      <ReportResult
        widgets={[
          {
            widgetId: "w-sensitive-fields",
            title: "Campos sensibles",
            data: {
              kind: "breakdown",
              entries: [
                { label: "Campos PII_DIRECTA", value: 4 },
                { label: "Políticas de retención activas", value: 1200 },
              ],
            },
          },
        ]}
      />,
    );
    const section = screen.getByRole("region", { name: "Campos sensibles" });
    expect(within(section).getByText("Campos PII_DIRECTA")).toBeInTheDocument();
    expect(within(section).getByText("4")).toBeInTheDocument();
    expect(within(section).getByText("1.200")).toBeInTheDocument();
  });

  it("un apartado sin líneas (o de un backend anterior) lo dice en vez de pintar JSON", () => {
    render(
      <ReportResult
        widgets={[
          {
            widgetId: "w-old",
            title: "Contadores operativos",
            data: { readinessStatus: "ready", alertCount: 1 },
          },
        ]}
      />,
    );
    expect(
      screen.getByText(/No hay datos para este apartado/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/readinessStatus/)).not.toBeInTheDocument();
  });
});

describe("filledFilters", () => {
  it("sólo manda los filtros con valor", () => {
    expect(filledFilters({ from: "2026-09-01", to: "", module: "  " })).toEqual(
      { from: "2026-09-01" },
    );
  });
});
