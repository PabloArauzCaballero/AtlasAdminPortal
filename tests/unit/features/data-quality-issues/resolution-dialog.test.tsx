import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResolutionDialog } from "@/features/data-quality-issues/resolution-dialog";
import { AtlasApiError } from "@/shared/api/errors";
import type { ResolutionState } from "@/features/data-quality-issues/types";
import type { DataQualityIssue } from "@/features/operations/types";

function resolutionWith(notes: string): NonNullable<ResolutionState> {
  return {
    issue: { issueId: "i1" } as DataQualityIssue,
    resolution: "resolved",
    reasonCode: "manual_review",
    notes,
  };
}

function renderDialog(
  overrides: Partial<Parameters<typeof ResolutionDialog>[0]> = {},
) {
  const onConfirm = vi.fn();
  render(
    <ResolutionDialog
      resolution={resolutionWith("")}
      isLoading={false}
      onCancel={vi.fn()}
      onChange={vi.fn()}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm };
}

// El label cambia a "Procesando…" mientras la mutación está en vuelo.
const confirmButton = () =>
  screen.getByRole("button", { name: /cerrar issue|procesando/i });

describe("ResolutionDialog · no permite inventar la auditoría", () => {
  it("deshabilita confirmar cuando las notas están vacías", () => {
    renderDialog();
    expect(confirmButton()).toBeDisabled();
  });

  it("deshabilita confirmar cuando las notas son demasiado cortas", () => {
    renderDialog({ resolution: resolutionWith("corto") });
    expect(confirmButton()).toBeDisabled();
  });

  it("habilita confirmar con notas suficientes", () => {
    renderDialog({
      resolution: resolutionWith("Validado contra la fuente primaria."),
    });
    expect(confirmButton()).toBeEnabled();
  });

  it("no dispara la mutación al hacer click sin notas", async () => {
    const { onConfirm } = renderDialog();
    await userEvent.click(confirmButton());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("dispara la mutación una vez con notas válidas", async () => {
    const { onConfirm } = renderDialog({
      resolution: resolutionWith("Validado contra la fuente primaria."),
    });
    await userEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("ResolutionDialog · doble envío y errores", () => {
  it("deshabilita confirmar mientras la mutación está en vuelo", () => {
    renderDialog({
      resolution: resolutionWith("Validado contra la fuente primaria."),
      isLoading: true,
    });
    expect(confirmButton()).toBeDisabled();
  });

  it("muestra el error dentro del modal, no detrás del backdrop", () => {
    renderDialog({
      resolution: resolutionWith("Validado contra la fuente primaria."),
      error: new AtlasApiError({
        status: 409,
        code: "CONFLICT",
        message: "El issue ya fue cerrado por otra persona.",
      }),
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      "El issue ya fue cerrado por otra persona.",
    );
  });
});
