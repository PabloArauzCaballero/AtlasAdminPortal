import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrivacyTransitionDialog } from "@/features/privacy-requests/transition-dialog";
import { AtlasApiError } from "@/shared/api/errors";

function renderDialog(
  overrides: Partial<Parameters<typeof PrivacyTransitionDialog>[0]> = {},
) {
  const onConfirm = vi.fn();
  render(
    <PrivacyTransitionDialog
      requestCode="DSR-1"
      target="completed"
      isPending={false}
      onCancel={vi.fn()}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm };
}

describe("PrivacyTransitionDialog · cerrar una solicitud del titular", () => {
  it("no deja marcarla atendida sin motivo suficiente", async () => {
    const { onConfirm } = renderDialog();
    const boton = screen.getByRole("button", { name: "Marcar atendida" });
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox"), "corto");
    expect(boton).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirma con el motivo recortado", async () => {
    const { onConfirm } = renderDialog({ target: "rejected" });
    await userEvent.type(
      screen.getByRole("textbox"),
      "  Retención legal de identidad y antifraude.  ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(onConfirm).toHaveBeenCalledWith(
      "Retención legal de identidad y antifraude.",
    );
  });

  it("dice que atender NO borra datos", () => {
    renderDialog();
    expect(screen.getByText(/NO borra datos/)).toBeInTheDocument();
  });

  it("tomarla no exige nota, pero una nota demasiado corta bloquea el envío", async () => {
    const { onConfirm } = renderDialog({ target: "in_progress" });
    const boton = screen.getByRole("button", { name: "Tomar" });
    expect(boton).toBeEnabled();
    await userEvent.type(screen.getByRole("textbox"), "hola");
    expect(boton).toBeDisabled();
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.click(boton);
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it("enseña el error del servidor dentro del diálogo", () => {
    renderDialog({
      error: new AtlasApiError({
        status: 409,
        code: "CONFLICT",
        message: "DATA_SUBJECT_REQUEST_INVALID_TRANSITION",
      }),
    });
    expect(
      screen.getByText("DATA_SUBJECT_REQUEST_INVALID_TRANSITION"),
    ).toBeInTheDocument();
  });
});
