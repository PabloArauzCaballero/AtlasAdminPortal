import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PhonePreview,
  type PreviewDraft,
} from "@/features/app-content/phone-preview";

const pieza = (parcial: Partial<PreviewDraft>): PreviewDraft => ({
  title: "",
  subtitle: "",
  body: "",
  bullets: [],
  actionKind: null,
  actionLabel: "",
  isActive: true,
  ...parcial,
});

const publicadas = [
  pieza({ title: "¿Qué es exactamente Atlas?", body: "Compras en cuotas." }),
  pieza({
    title: "¿Cómo deciden cuánto me prestan?",
    body: "Lo calcula el motor.",
  }),
];

describe("el celular pinta cada pantalla como la app", () => {
  it("Preguntas frecuentes: plegadas en una tarjeta, bajo «¿Necesitas hablar con alguien?»", () => {
    render(
      <PhonePreview
        surface="faq"
        surfaceLabel="Preguntas frecuentes"
        draft={null}
        published={publicadas}
      />,
    );
    const phone = screen.getByTestId("app-content-phone");
    expect(phone).toHaveTextContent("¿Necesitas hablar con alguien?");
    expect(phone).toHaveTextContent("Toca una para ver la respuesta.");
    // Plegadas: se ven las preguntas, no las respuestas.
    expect(phone).toHaveTextContent("¿Qué es exactamente Atlas?");
    expect(phone).not.toHaveTextContent("Compras en cuotas.");

    const faq = screen.getByTestId("phone-faq");
    fireEvent.click(
      within(faq).getByRole("button", { name: /Qué es exactamente Atlas/ }),
    );
    expect(phone).toHaveTextContent("Compras en cuotas.");
    expect(phone).not.toHaveTextContent("Lo calcula el motor.");
  });

  it("mientras se escribe, la pregunta sale abierta; sin título avisa que la app no la enseña", () => {
    const { rerender } = render(
      <PhonePreview
        surface="faq"
        surfaceLabel="Preguntas frecuentes"
        draft={pieza({
          title: "¿Puedo pagar antes?",
          body: "Sí, sin recargo.",
        })}
        published={[]}
      />,
    );
    expect(screen.getByTestId("app-content-phone")).toHaveTextContent(
      "Sí, sin recargo.",
    );

    rerender(
      <PhonePreview
        surface="faq"
        surfaceLabel="Preguntas frecuentes"
        draft={pieza({ body: "Sí, sin recargo." })}
        published={[]}
      />,
    );
    expect(screen.getByTestId("phone-faq-sin-titulo")).toBeInTheDocument();
  });

  it("Inicio: las piezas van en tarjetas bajo «Tu línea Atlas»", () => {
    render(
      <PhonePreview
        surface="home"
        surfaceLabel="Inicio"
        draft={null}
        published={[pieza({ title: "Aviso", body: "Hoy cierra temprano." })]}
      />,
    );
    const inicio = screen.getByTestId("phone-screen-home");
    expect(inicio).toHaveTextContent("Tu línea Atlas");
    expect(inicio).toHaveTextContent("Hoy cierra temprano.");
  });
});
