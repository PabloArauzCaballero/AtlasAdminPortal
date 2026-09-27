import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import { CaseLinksPanel } from "@/features/support/case-links-panel";
import { Veredicto } from "@/features/support/channel-integrity-panel";
import { siguienteAccion } from "@/features/support/knowledge-transition-dialog";
import { splitTerms } from "@/features/support/knowledge-version-form";
import { renderWithProviders } from "../../../helpers/render-with-providers";

beforeEach(() => {
  apiRequest.mockReset();
});

describe("Veredicto de integridad", () => {
  it("una cadena que cuadra lo dice con el número de mensajes", () => {
    render(
      <Veredicto resultado={{ valid: true, checked: 12, brokenAt: [] }} />,
    );
    expect(screen.getByText(/Intacta: los 12 mensajes/)).toBeInTheDocument();
  });

  /** El servidor cuenta desde 0; la persona lee «mensaje 3», no «índice 2». */
  it("una cadena rota señala los mensajes en la numeración de la persona", () => {
    render(
      <Veredicto resultado={{ valid: false, checked: 9, brokenAt: [2, 5] }} />,
    );
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("los mensajes 3, 6 de 9");
    expect(alerta).toHaveTextContent(/incidente de seguridad/);
  });
});

describe("recorrido de una versión", () => {
  it("cada estado ofrece sólo el paso que le sigue", () => {
    expect(siguienteAccion("DRAFT")).toBe("submit-review");
    expect(siguienteAccion("IN_REVIEW")).toBe("approve");
    expect(siguienteAccion("APPROVED")).toBe("publish");
    expect(siguienteAccion("PUBLISHED")).toBeNull();
    expect(siguienteAccion("RETIRED")).toBeNull();
  });

  it("las palabras de búsqueda descartan lo que el servidor rechazaría", () => {
    expect(splitTerms(" sms , otp,, x, no me llega el codigo ", 60)).toEqual([
      "sms",
      "otp",
      "no me llega el codigo",
    ]);
  });
});

describe("CaseLinksPanel", () => {
  it("lee los vínculos en los dos sentidos", () => {
    renderWithProviders(
      <CaseLinksPanel
        caseId="10"
        links={[
          {
            caseId: "10",
            linkedCaseId: "11",
            linkType: "DUPLICATE_OF",
            note: null,
          },
          {
            caseId: "12",
            linkedCaseId: "10",
            linkType: "CAUSED_BY",
            note: "nota",
          },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "#11" })).toHaveAttribute(
      "href",
      "/internal/support/cases/11",
    );
    expect(screen.getByRole("link", { name: "#12" })).toBeInTheDocument();
    expect(screen.getByText("nota")).toBeInTheDocument();
  });

  it("no deja vincular el caso consigo mismo y manda el vínculo al servidor", async () => {
    apiRequest.mockResolvedValue({});
    renderWithProviders(<CaseLinksPanel caseId="10" links={[]} />);
    const campo = screen.getByLabelText("Número del otro caso");
    const boton = screen.getByRole("button", { name: "Vincular" });

    fireEvent.change(campo, { target: { value: "10" } });
    expect(boton).toBeDisabled();

    fireEvent.change(campo, { target: { value: "15" } });
    expect(boton).toBeEnabled();
    fireEvent.click(boton);

    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    const [ruta, opciones] = apiRequest.mock.calls[0] as [
      string,
      { body: unknown },
    ];
    expect(ruta).toBe("/internal/support/cases/10/links");
    expect(opciones.body).toEqual({
      linkedCaseId: "15",
      linkType: "RELATED_TO",
    });
  });
});
