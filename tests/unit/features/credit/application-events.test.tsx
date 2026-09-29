import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicationEvents } from "@/features/credit/application-events";
import type { CreditApplicationEvent } from "@/features/credit/types";

const EVENTO: CreditApplicationEvent = {
  id: "1",
  eventType: "decision_recorded",
  previousStatus: "under_review",
  newStatus: "approved",
  actorType: "risk_analyst",
  actorInternalUserId: "12",
  reasonCode: null,
  notes: "Ingresos verificados",
  happenedAt: "2026-09-01T10:00:00.000Z",
};

/** El historial de una solicitud: cada evento es una fila con su evento, su cambio y su autor. */
describe("ApplicationEvents", () => {
  it("es una tabla con cabeceras y una fila por evento", () => {
    render(<ApplicationEvents events={[EVENTO]} />);
    const tabla = screen.getByRole("table");
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(
      expect.arrayContaining([
        "Cuándo",
        "Evento",
        "Cambio de estado",
        "Quién",
        "Motivo",
        "Notas",
      ]),
    );
    expect(within(tabla).getByText("Decisión registrada")).toBeInTheDocument();
    expect(within(tabla).getByText("Riesgo #12")).toBeInTheDocument();
    expect(within(tabla).getByText("Ingresos verificados")).toBeInTheDocument();
  });

  it("sin eventos explica por qué puede estar vacío", () => {
    render(<ApplicationEvents events={[]} />);
    expect(screen.getByText("Sin eventos registrados.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
