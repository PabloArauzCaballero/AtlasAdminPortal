import { describe, expect, it } from "vitest";
import {
  stepCountsByWorkflowCode,
  stepTone,
} from "@/features/qa-runs/run-step-counts";
import { runFixture } from "./qa-runs-fixtures";

const counts = (passed: number, failed: number, indeterminate = 0) => ({
  stepKey: "s",
  workflowStepCode: "s",
  passed,
  failed,
  skipped: 0,
  notApplicable: 0,
  indeterminate,
  cancelled: 0,
});

describe("conteos por nodo del árbol · UI/contrato con respuestas simuladas", () => {
  it("una persona verde entre muchas rojas no pinta el paso de verde", () => {
    expect(stepTone(counts(1, 99))).toBe("mixed");
    expect(stepTone(counts(0, 5))).toBe("failed");
    expect(stepTone(counts(5, 0))).toBe("passed");
    expect(stepTone(counts(5, 0, 1))).toBe("mixed");
    expect(stepTone(counts(0, 0))).toBe("none");
  });

  it("agrupa por workflowStepCode y omite los pasos sin él", () => {
    const run = runFixture({
      steps: [
        { ...counts(2, 1), stepKey: "a", workflowStepCode: "login" },
        { ...counts(1, 0), stepKey: "b", workflowStepCode: "login" },
        { ...counts(3, 0), stepKey: "c", workflowStepCode: null },
      ],
    });
    const byCode = stepCountsByWorkflowCode(run);

    expect([...byCode.keys()]).toEqual(["login"]);
    expect(byCode.get("login")).toMatchObject({ passed: 3, failed: 1 });
    expect(run.steps[0].passed).toBe(2);
  });
});
