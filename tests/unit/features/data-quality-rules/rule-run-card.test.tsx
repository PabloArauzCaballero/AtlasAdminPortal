import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RuleRunCard } from "@/features/data-quality-rules/rule-run-card";

/**
 * «Ejecutar regla» llamaba a `POST /internal/data-quality/rules/:id/run`, retirada por AtlasBackend
 * (devolvía 200 sin ejecutar nada; luego 404). No hay ejecución por regla: la tarjeta lo dice y no
 * ofrece el botón.
 */
describe("RuleRunCard", () => {
  it("no ofrece ejecutar la regla y explica dónde corre el recálculo", () => {
    render(<RuleRunCard ruleId="r1" />);
    expect(
      screen.queryByRole("button", { name: /ejecutar/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("rule-run-note")).toHaveTextContent(
      /Recalcular calidad de datos/,
    );
  });
});
