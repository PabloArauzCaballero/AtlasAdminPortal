import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const explicacion = vi.fn();
vi.mock("@/features/risk-assessments/hooks", () => ({
  useRiskAssessmentExplanation: () => explicacion(),
}));

const { ExplanationSection } =
  await import("@/features/risk-assessments/explanation-section");

const DATA = {
  decisionSource: "ruleset",
  decisionExecutionId: null,
  decision: "approve",
  recommendedAction: "approve",
  summary: "Perfil sólido.",
  topPositiveFactors: [
    { code: "INCOME_STABLE", label: "Ingresos estables", impact: "positive" },
  ],
  topNegativeFactors: [
    { code: "NEW_DEVICE", label: "Dispositivo nuevo", impact: "negative" },
  ],
  rulesFired: ["R-1"],
};

/**
 * Los factores de una evaluación: uno a favor y otro en contra son registros del mismo tipo que se
 * comparan, así que van en UNA tabla con su impacto en columna, no en dos cajas de tarjetas.
 */
describe("ExplanationSection · factores", () => {
  it("junta los factores a favor y en contra en una tabla con cabeceras", () => {
    explicacion.mockReturnValue({ data: DATA, isLoading: false, error: null });
    render(<ExplanationSection runId="9" decisionSource="ruleset" />);
    const tabla = screen.getByRole("table");
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(expect.arrayContaining(["Impacto", "Código", "Qué mide"]));
    expect(within(tabla).getAllByRole("row")).toHaveLength(3);
    expect(within(tabla).getByText("A favor")).toBeInTheDocument();
    expect(within(tabla).getByText("En contra")).toBeInTheDocument();
    expect(within(tabla).getByText("NEW_DEVICE")).toBeInTheDocument();
  });

  it("sin factores dice que la evaluación no dejó ninguno", () => {
    explicacion.mockReturnValue({
      data: { ...DATA, topPositiveFactors: [], topNegativeFactors: [] },
      isLoading: false,
      error: null,
    });
    render(<ExplanationSection runId="9" decisionSource="ruleset" />);
    expect(screen.getByText("Sin factores registrados.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
