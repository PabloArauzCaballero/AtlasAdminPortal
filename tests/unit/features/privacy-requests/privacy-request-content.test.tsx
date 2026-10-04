import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrivacyRequestContent } from "@/features/privacy-requests/privacy-request-content";
import { rectificationFieldLabel } from "@/features/privacy-requests/labels";
import type { PrivacyRequestDetail } from "@/features/privacy-requests/types";

/**
 * «Lo que pidió»: hasta el 2026-10-04 la cola recibía «quiere corregir algo» sin saber qué. Ahora enseña el dato, el
 * valor correcto, lo que escribió la persona y si confirmó su PIN.
 */
const base: PrivacyRequestDetail = {
  requestId: "9",
  requestCode: "DSR-9",
  requestType: "rectification",
  status: "received",
  receivedAt: "2026-10-04T10:00:00.000Z",
  dueAt: "2026-10-19T10:00:00.000Z",
  resolvedAt: null,
  resolutionNotes: null,
  handledByInternalUserId: null,
  handledByName: null,
  customerId: "53",
  customerCode: "C-53",
  customerName: "Pablo Arauz",
  overdue: false,
  daysToDue: 15,
  allowedTransitions: ["in_progress"],
  history: [],
};

describe("Lo que pidió", () => {
  it("una corrección enseña el dato, el valor correcto, el texto y el PIN confirmado", () => {
    render(
      <PrivacyRequestContent
        solicitud={{
          ...base,
          rectificationField: "zone",
          hasProposedValue: true,
          proposedValue: "Equipetrol",
          description: "mi zona está mal escrita",
          pinVerifiedAt: "2026-10-04T09:58:00.000Z",
        }}
      />,
    );
    expect(screen.getByText("Zona o barrio")).toBeInTheDocument();
    expect(screen.getByText("Equipetrol")).toBeInTheDocument();
    expect(screen.getByText("mi zona está mal escrita")).toBeInTheDocument();
    expect(screen.getByText(/^Sí, /)).toBeInTheDocument();
    expect(
      screen.getByText(/Ver el valor queda registrado en la auditoría/),
    ).toBeInTheDocument();
  });

  it("una solicitud vieja (sin contenido) dice que hay que preguntarle al cliente", () => {
    render(<PrivacyRequestContent solicitud={base} />);
    expect(
      screen.getByText(/anterior al 4 de octubre de 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText("No escribió nada.")).toBeInTheDocument();
  });

  it("sin PIN confirmado avisa que hay que confirmar la identidad por otro canal", () => {
    render(
      <PrivacyRequestContent
        solicitud={{
          ...base,
          requestType: "deletion",
          description: "ya no la uso",
        }}
      />,
    );
    expect(
      screen.getByText(/confirma por otro canal que es el titular/),
    ).toBeInTheDocument();
    // Un borrado no tiene «qué dato corregir».
    expect(screen.queryByText("Qué dato corregir")).toBeNull();
  });

  it("un dato del carnet pide la foto del documento y actualizar la diligencia debida", () => {
    render(
      <PrivacyRequestContent
        solicitud={{
          ...base,
          rectificationField: "document_number",
          hasProposedValue: true,
          proposedValue: "1234567",
        }}
      />,
    );
    expect(screen.getByText(/diligencia debida/)).toBeInTheDocument();
  });

  it("si el valor no se pudo descifrar, lo dice en vez de inventar uno", () => {
    render(
      <PrivacyRequestContent
        solicitud={{
          ...base,
          rectificationField: "city",
          hasProposedValue: true,
          proposedValue: null,
        }}
      />,
    );
    expect(screen.getByText(/No se pudo leer el valor/)).toBeInTheDocument();
  });

  it("las etiquetas: campo conocido en español, desconocido tal cual, vacío dicho", () => {
    expect(rectificationFieldLabel("declared_income")).toBe(
      "Ingreso mensual declarado",
    );
    expect(rectificationFieldLabel("campo_nuevo")).toBe("campo_nuevo");
    expect(rectificationFieldLabel(null)).toBe("No lo indicó");
  });
});
