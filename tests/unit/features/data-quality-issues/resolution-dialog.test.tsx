import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResolutionDialog } from "@/features/data-quality-issues/resolution-dialog";
import { AtlasApiError } from "@/shared/api/errors";

function renderDialog(
  overrides: Partial<Parameters<typeof ResolutionDialog>[0]> = {},
) {
  const onSubmit = vi.fn();
  render(
    <ResolutionDialog
      issueId="i1"
      isLoading={false}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit };
}

const confirmButton = () =>
  screen.getByRole("button", { name: /cerrar issue|procesando/i });

const notasFactory = () => screen.getByRole("textbox"); // el único textbox del diálogo es "Notas"

describe("ResolutionDialog · no permite inventar la auditoría", () => {
  it("no dispara la mutación si las notas están vacías", async () => {
    const { onSubmit } = renderDialog();
    await userEvent.click(confirmButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("no dispara la mutación con notas demasiado cortas", async () => {
    const { onSubmit } = renderDialog();
    await userEvent.type(notasFactory(), "corto");
    await userEvent.click(confirmButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de validación cuando las notas faltan", async () => {
    renderDialog();
    await userEvent.click(confirmButton());
    expect(await screen.findByText(/mín\. 10 caracteres/i)).toBeInTheDocument();
  });

  it("dispara la mutación una vez con notas válidas, con lo que el operador escribió", async () => {
    const { onSubmit } = renderDialog();
    await userEvent.type(notasFactory(), "Validado contra la fuente primaria.");
    await userEvent.click(confirmButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      resolution: "resolved",
      reasonCode: "manual_review",
      notes: "Validado contra la fuente primaria.",
    });
  });
});

describe("ResolutionDialog · doble envío y errores", () => {
  it("deshabilita el botón mientras la mutación está en vuelo", () => {
    renderDialog({ isLoading: true });
    expect(screen.getByRole("button", { name: /procesando/i })).toBeDisabled();
  });

  it("muestra el error dentro del modal, no detrás del backdrop", () => {
    renderDialog({
      error: new AtlasApiError({
        status: 409,
        code: "CONFLICT",
        message: "El issue ya fue cerrado por otra persona.",
      }),
    });
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "El issue ya fue cerrado por otra persona.",
    );
  });
});

describe("ResolutionDialog · accesibilidad", () => {
  it("el diálogo se nombra con el issue", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toHaveAccessibleName(/Cerrar issue #i1/);
  });

  it("Escape cancela", async () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });
});
