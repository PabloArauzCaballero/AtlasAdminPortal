import { describe, expect, it } from "vitest";
import { pickTemplate, planQuickLaunch } from "@/features/qa-runs/quick-launch";
import { capabilitiesFixture, templateFixture } from "./qa-runs-fixtures";

const plan = (
  workflowCode: string,
  templates: ReturnType<typeof templateFixture>[],
) =>
  planQuickLaunch({
    workflowCode,
    persons: 10,
    capabilities: capabilitiesFixture(),
    templates,
    seed: "carga-1",
  });

describe("planQuickLaunch", () => {
  // Regresión: sólo dos flujos tienen recetas propias. En el recorrido de crédito (C-01) el
  // servidor devolvía recetas que SÍ pasan por sus pasos y el portal las descartaba por no ser
  // «de» ese flujo: «todavía no tiene un recorrido de prueba publicado».
  it("lanza con una receta de otro flujo que el servidor casó con los pasos de éste", () => {
    const result = plan("customer_credit_journey", [
      templateFixture({ code: "corta", matchedStepCodes: ["signup"] }),
      templateFixture({
        code: "larga",
        matchedStepCodes: ["signup", "kyc", "credit"],
      }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.template.code).toBe("larga");
      expect(result.request.workflowCode).toBe("customer_credit_journey");
      expect(result.request.concurrency).toBe(10);
    }
  });

  it("prefiere la receta escrita para el flujo aunque otra recorra más pasos", () => {
    const own = templateFixture({
      code: "propia",
      workflowCode: "f1",
      matchedStepCodes: ["a"],
    });
    const other = templateFixture({
      code: "ajena",
      matchedStepCodes: ["a", "b", "c"],
    });
    expect(pickTemplate([other, own], "f1")?.code).toBe("propia");
  });

  it("no elige una receta en borrador y dice por qué no se puede", () => {
    const result = plan("customer_credit_journey", [
      templateFixture({
        status: "BLOCKED",
        blockedReasons: ["Requiere el Motor"],
        matchedStepCodes: ["signup"],
      }),
    ]);
    expect(result).toEqual({
      ok: false,
      problem:
        "El recorrido de este flujo no se puede ejecutar: Requiere el Motor.",
    });
  });

  it("sin ninguna receta que pase por el flujo lo dice", () => {
    const result = plan("sin_recetas", [
      templateFixture({ matchedStepCodes: [] }),
    ]);
    expect(result).toEqual({
      ok: false,
      problem: "Ningún recorrido de prueba pasa por los pasos de este flujo.",
    });
  });
});
