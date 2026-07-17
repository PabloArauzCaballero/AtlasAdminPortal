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
    const { container } = render(<Harness onClose={onClose} />);

    await userEvent.click(container.querySelector(".overlay") as Element);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("con closeOnBackdrop, el click en el backdrop cierra", async () => {
    const onClose = vi.fn();
    const { container } = render(<Harness onClose={onClose} closeOnBackdrop />);

    await userEvent.click(container.querySelector(".overlay") as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("un click dentro del panel nunca cierra", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} closeOnBackdrop />);

    await userEvent.click(screen.getByRole("button", { name: "Segundo" }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
