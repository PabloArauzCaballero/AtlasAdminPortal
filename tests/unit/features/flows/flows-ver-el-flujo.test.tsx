import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildFlowColumns } from "@/features/flows/flows-columns";
import { FlowsSummaryTiles } from "@/features/flows/flows-summary-tiles";
import type { Flow } from "@/features/flows/types";

describe("Mapa de rutas: ver el flujo", () => {
  it("cada fila lleva a su diagrama con «Ver flujo»", () => {
    const columna = buildFlowColumns(() => undefined).find(
      (column) => column.id === "flujo",
    );
    expect(columna).toBeDefined();
    const celda = columna!.cell as (ctx: {
      row: { original: Pick<Flow, "id"> };
    }) => React.ReactElement;
    render(celda({ row: { original: { id: "flow_auth_login" } } }));
    const enlace = screen.getByRole("link", { name: /Ver flujo/ });
    expect(enlace).toHaveAttribute(
      "href",
      "/internal/flows/graph?flow=flow_auth_login",
    );
  });

  it("las tarjetas que filtran lo dicen y filtran la tabla al tocarlas", () => {
    const setFilter = vi.fn();
    render(
      <FlowsSummaryTiles
        summary={undefined}
        critical={142}
        broken={0}
        stale={0}
        setFilter={setFilter}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Críticos: filtrar la tabla" }),
    );
    expect(setFilter).toHaveBeenCalledWith("risk", "CRITICAL");
    expect(screen.getAllByText(/Toca para filtrar/)).toHaveLength(3);
  });
});
