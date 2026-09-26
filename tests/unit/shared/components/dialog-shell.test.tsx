import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DialogShell } from "@/shared/components/ui/dialog-shell";

function Harness({
  closeOnBackdrop = false,
  onClose = vi.fn(),
}: {
  closeOnBackdrop?: boolean;
  onClose?: () => void;
}) {
  return (
    <DialogShell
      open
      labelledBy="t"
      onClose={onClose}
      closeOnBackdrop={closeOnBackdrop}
      overlayClassName="overlay"
    >
      <h2 id="t">Título del diálogo</h2>
      <button type="button">Primero</button>
      <button type="button">Segundo</button>
      <button type="button">Tercero</button>
    </DialogShell>
  );
}

/**
 * El backdrop se busca en el DOCUMENTO, no en el contenedor del render: el diálogo se monta en
 * `document.body` con `createPortal`. Buscarlo en `container` devolvía `null` y la prueba de
 * "por defecto no cierra" pasaba en falso — no cerraba porque no se hacía click en nada.
 */
function backdrop(): Element {
  const elemento = document.body.querySelector(".overlay");
  if (!elemento) throw new Error("No se encontró el backdrop del diálogo.");
  return elemento;
}

describe("DialogShell · montaje", () => {
  /*
   * La regresión que este caso guarda: montado donde se escribe, el diálogo caía dentro del
   * `<main>` del armazón, que tiene contexto de apilamiento propio (una animación con
   * `fill-mode: both` sobre la opacidad). Su `z-40` no llegaba a competir con el `z-20` de la
   * barra superior, y la cabecera del drawer —título y botón de cerrar— quedaba TAPADA por ella.
   */
  it("se monta fuera del árbol donde se declara, en el body", () => {
    const { container } = render(<Harness />);

    expect(container.querySelector(".overlay")).toBeNull();
    expect(document.body.querySelector(".overlay")).not.toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("DialogShell · semántica", () => {
  it("expone role dialog, aria-modal y aria-labelledby al título", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "t");
    expect(dialog).toHaveAccessibleName("Título del diálogo");
  });
});

describe("DialogShell · foco", () => {
  it("enfoca el primer control al abrir", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Primero" })).toHaveFocus();
  });

  it("Tab desde el último control vuelve al primero (focus-trap)", async () => {
    render(<Harness />);
    screen.getByRole("button", { name: "Tercero" }).focus();

    await userEvent.tab();

    expect(screen.getByRole("button", { name: "Primero" })).toHaveFocus();
  });

  it("Shift+Tab desde el primero salta al último", async () => {
    render(<Harness />);
    screen.getByRole("button", { name: "Primero" }).focus();

    await userEvent.tab({ shift: true });

    expect(screen.getByRole("button", { name: "Tercero" })).toHaveFocus();
  });

  it("devuelve el foco al disparador al cerrar", async () => {
    function Toggle() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
          <DialogShell
            open={open}
            labelledBy="t"
            onClose={() => setOpen(false)}
          >
            <h2 id="t">Título</h2>
            <button type="button" onClick={() => setOpen(false)}>
              Cerrar
            </button>
          </DialogShell>
        </>
      );
    }
    render(<Toggle />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(trigger).toHaveFocus();
  });
});

describe("DialogShell · cierre", () => {
  it("Escape cierra", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("por defecto un click en el backdrop NO cierra", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await userEvent.click(backdrop());

    expect(onClose).not.toHaveBeenCalled();
  });

  it("con closeOnBackdrop, el click en el backdrop cierra", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} closeOnBackdrop />);

    await userEvent.click(backdrop());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("un click dentro del panel nunca cierra", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} closeOnBackdrop />);

    await userEvent.click(screen.getByRole("button", { name: "Segundo" }));

    expect(onClose).not.toHaveBeenCalled();
  });
});

/**
 * Que el diálogo tape lo de detrás no es sólo pintar un velo encima: mientras esté abierto, el
 * resto de la aplicación —la barra lateral es lo primero que se intenta pulsar— no se usa ni con
 * el ratón, ni con la rueda, ni con el tabulador.
 */
describe("DialogShell · el fondo mientras está abierto", () => {
  function conFondo() {
    const fondo = document.createElement("div");
    fondo.id = "fondo";
    document.body.append(fondo);
    return fondo;
  }

  it("marca inerte lo que no es el velo y libera el scroll al cerrar", () => {
    const fondo = conFondo();
    const vista = render(<Harness />);

    expect(fondo.hasAttribute("inert")).toBe(true);
    expect(backdrop().hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("hidden");

    vista.unmount();
    expect(fondo.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    fondo.remove();
  });

  it("con dos diálogos encadenados, el fondo sigue inerte hasta que se cierra el último", () => {
    const fondo = conFondo();
    const primero = render(<Harness />);
    const segundo = render(<Harness />);

    segundo.unmount();
    // El de abajo sigue abierto: soltar el fondo aquí devolvería la barra lateral a la vida con un
    // diálogo todavía en pantalla.
    expect(fondo.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    primero.unmount();
    expect(fondo.hasAttribute("inert")).toBe(false);
    fondo.remove();
  });
});
