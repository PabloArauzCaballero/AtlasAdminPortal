import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FieldTooltip } from "@/shared/components/ui/field-tooltip";
import { FieldLabel } from "@/shared/components/ui/field-label";

const TEXTO = "El correo al que llega el aviso de cada decisión del motor.";

describe("FieldTooltip", () => {
  it("el texto está siempre en el DOM para el lector, aunque la burbuja esté cerrada", () => {
    render(
      <FieldTooltip label="Correo" text={TEXTO} describedById="ayuda-correo" />,
    );

    // Sin abrir nada: el <span> oculto existe y es al que apunta el aria-describedby del control.
    expect(document.getElementById("ayuda-correo")?.textContent).toBe(TEXTO);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("el nombre accesible del botón sale de `title`, no de `aria-label`", () => {
    // Medido en el ERP: con `aria-label="Ayuda: Ciudad"`, `getByLabel('Ciudad')` devolvía DOS
    // elementos (el control y el botón) y el E2E del campo se rompía sin que la pantalla
    // tuviera nada malo.
    render(
      <FieldTooltip label="Ciudad" text={TEXTO} describedById="ayuda-ciudad" />,
    );

    const boton = screen.getByRole("button");
    expect(boton).toHaveAttribute("title", "Ayuda: Ciudad");
    expect(boton).not.toHaveAttribute("aria-label");
  });

  it("abre al pasar el ratón y cierra al salir", async () => {
    render(<FieldTooltip label="Correo" text={TEXTO} />);

    await userEvent.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent(TEXTO);

    await userEvent.unhover(screen.getByRole("button"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("abre con el teclado (foco) sin tocar el ratón", async () => {
    render(<FieldTooltip label="Correo" text={TEXTO} />);

    await userEvent.tab();

    expect(screen.getByRole("button")).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent(TEXTO);
  });

  it("Escape la cierra sin mover el ratón (WCAG 1.4.13)", async () => {
    render(<FieldTooltip label="Correo" text={TEXTO} />);

    await userEvent.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("`open` la abre desde fuera: el control del campo tiene el foco", () => {
    render(<FieldTooltip label="Correo" text={TEXTO} open />);

    expect(screen.getByRole("tooltip")).toHaveTextContent(TEXTO);
  });
});

describe("FieldLabel", () => {
  it("la etiqueta apunta al control por htmlFor y el ⓘ queda fuera de ella", () => {
    const { container } = render(
      <FieldLabel
        htmlFor="campo-1"
        label="Correo"
        tooltip={TEXTO}
        describedById="ayuda-1"
      />,
    );

    const label = container.querySelector("label");
    expect(label).toHaveAttribute("for", "campo-1");
    // El botón NO puede estar dentro del <label>: si lo estuviera, su nombre entraría en el
    // nombre accesible del campo.
    expect(label?.querySelector("button")).toBeNull();
  });

  it("sin tooltip no pinta el ⓘ", () => {
    render(<FieldLabel htmlFor="campo-1" label="Correo" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("marca el asterisco de obligatorio", () => {
    render(<FieldLabel htmlFor="campo-1" label="Correo" required />);

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("sin htmlFor pinta un <span>, para grupos sin un único control", () => {
    const { container } = render(<FieldLabel label="Canales" />);

    expect(container.querySelector("label")).toBeNull();
    expect(screen.getByText("Canales")).toBeInTheDocument();
  });
});
