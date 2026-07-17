import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

const PHRASE = "EJECUTAR";

/** Reproduce el uso real: el padre deja el diálogo montado y alterna `open`. */
function ReopenHarness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reabrir
      </button>
      <ConfirmDialog
        open={open}
        title="Acción destructiva"
        description="Esto no se puede deshacer."
        typedConfirmationPhrase={PHRASE}
        onConfirm={vi.fn()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

const confirmButton = () => screen.getByRole("button", { name: /confirmar/i });

describe("ConfirmDialog · doble confirmación", () => {
  it("arranca deshabilitado hasta escribir la frase exacta", () => {
    render(
      <ConfirmDialog
        open
        title="Acción destructiva"
        description="Esto no se puede deshacer."
        typedConfirmationPhrase={PHRASE}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(confirmButton()).toBeDisabled();
  });

  it("se habilita al escribir la frase exacta", async () => {
    render(
      <ConfirmDialog
        open
        title="Acción destructiva"
        description="Esto no se puede deshacer."
        typedConfirmationPhrase={PHRASE}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByRole("textbox"), PHRASE);
    expect(confirmButton()).toBeEnabled();
  });

  it("NO se habilita con una frase parecida", async () => {
    render(
      <ConfirmDialog
        open
        title="Acción destructiva"
        description="Esto no se puede deshacer."
        typedConfirmationPhrase={PHRASE}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByRole("textbox"), "ejecutar");
    expect(confirmButton()).toBeDisabled();
  });

  it("al reabrir, la frase tecleada NO sobrevive: vuelve a exigir confirmación", async () => {
    render(<ReopenHarness />);

    // Se confirma una vez escribiendo la frase…
    await userEvent.type(screen.getByRole("textbox"), PHRASE);
    expect(confirmButton()).toBeEnabled();

    // …se cierra y se reabre.
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    await userEvent.click(screen.getByRole("button", { name: /reabrir/i }));

    // El bug: el estado sobrevivía y el botón aparecía ya habilitado.
    expect(confirmButton()).toBeDisabled();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

describe("ConfirmDialog · accesibilidad", () => {
  it("el diálogo se nombra con su título", () => {
    render(
      <ConfirmDialog
        open
        title="Acción destructiva"
        description="Esto no se puede deshacer."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "Acción destructiva",
    );
  });

  it("Escape cancela", async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Acción destructiva"
        description="Esto no se puede deshacer."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("no confirma dos veces si la mutación está en vuelo", () => {
    render(
      <ConfirmDialog
        open
        title="Acción destructiva"
        description="Esto no se puede deshacer."
        isLoading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /procesando/i })).toBeDisabled();
  });
});
