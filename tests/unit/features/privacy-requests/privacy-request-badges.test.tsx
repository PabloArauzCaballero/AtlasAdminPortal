import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DuePill,
  PrivacyStatusBadge,
} from "@/features/privacy-requests/privacy-request-badges";
import {
  OVERDUE_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  statusLabel,
  typeLabel,
} from "@/features/privacy-requests/labels";

describe("plazo y estado de una solicitud del titular", () => {
  it("una vencida dice cuántos días lleva vencida", () => {
    render(<DuePill request={{ overdue: true, daysToDue: -4 }} />);
    expect(screen.getByText("Vencida hace 4 d")).toBeInTheDocument();
  });

  it("una abierta en plazo dice cuántos días quedan; hoy dice «Vence hoy»", () => {
    const { rerender } = render(
      <DuePill request={{ overdue: false, daysToDue: 9 }} />,
    );
    expect(screen.getByText("Quedan 9 d")).toBeInTheDocument();
    rerender(<DuePill request={{ overdue: false, daysToDue: 0 }} />);
    expect(screen.getByText("Vence hoy")).toBeInTheDocument();
  });

  it("una cerrada no cuenta plazo", () => {
    render(<DuePill request={{ overdue: false, daysToDue: null }} />);
    expect(screen.getByText("Cerrada")).toBeInTheDocument();
  });

  it("los estados y derechos se leen en palabras, no en códigos", () => {
    render(<PrivacyStatusBadge status="in_progress" />);
    expect(screen.getByText("En atención")).toBeInTheDocument();
    expect(statusLabel("completed")).toBe("Atendida");
    expect(typeLabel("portability")).toBe("Portabilidad");
    expect(typeLabel("desconocido")).toBe("desconocido");
  });

  it("cada opción de filtro explica qué significa", () => {
    for (const opcion of [
      ...STATUS_OPTIONS,
      ...TYPE_OPTIONS,
      ...OVERDUE_OPTIONS,
    ])
      expect(opcion.description?.length).toBeGreaterThan(10);
  });
});
