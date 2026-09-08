import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tooltip } from "@/shared/components/ui/tooltip";

function Boton({ onClick }: Readonly<{ onClick?: () => void }>) {
  return (
    <Tooltip text="Mueve este paso una posición hacia arriba.">
      <button type="button" aria-label="Subir el paso" onClick={onClick}>
        icono
      </button>
    </Tooltip>
  );
}

describe("Tooltip · cuándo aparece", () => {
  it("en reposo no hay burbuja: no roba espacio ni lo lee nadie", () => {
    render(<Boton />);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("el ratón por encima la abre", async () => {
    render(<Boton />);

    await userEvent.hover(screen.getByRole("button"));

    expect(
      screen.getByText("Mueve este paso una posición hacia arriba."),
    ).toBeInTheDocument();
  });

  it("al salir el ratón se cierra", async () => {
    render(<Boton />);

    await userEvent.hover(screen.getByRole("button"));
    await userEvent.unhover(screen.getByRole("button"));

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("el foco del teclado la abre igual que el ratón", async () => {
    // Quien navega con tabulador es justo quien no puede pasar el ratón por
    // encima; si sólo respondiera al hover, el icono se quedaría sin explicar.
    render(<Boton />);

    await userEvent.tab();

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("Escape la cierra sin sacar el foco del control", async () => {
    render(<Boton />);

    await userEvent.tab();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveFocus();
  });
});

describe("Tooltip · qué anuncia", () => {
  it("describe al control sin robarle el nombre", async () => {
    render(<Boton />);

    await userEvent.hover(screen.getByRole("button"));

    const boton = screen.getByRole("button", { name: "Subir el paso" });
    expect(boton).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
  });

  it("cerrada no deja un aria-describedby apuntando a la nada", async () => {
    render(<Boton />);

    await userEvent.hover(screen.getByRole("button"));
    await userEvent.unhover(screen.getByRole("button"));

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
  });
});

describe("Tooltip · no estorba al control", () => {
  it("el onClick propio sigue llegando", async () => {
    const onClick = vi.fn();
    render(<Boton onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
