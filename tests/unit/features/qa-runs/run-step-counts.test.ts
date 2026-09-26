import { describe, expect, it } from "vitest";
import {
  endpointKey,
  stepCountsByEndpoint,
  stepTone,
} from "@/features/qa-runs/run-step-counts";
import { runFixture } from "./qa-runs-fixtures";

const counts = (passed: number, failed: number, indeterminate = 0) => ({
  stepKey: "s",
  workflowStepCode: "s",
  endpoint: "GET /s",
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

  it("normaliza el endpoint igual que el backend", () => {
    expect(
      endpointKey("post", "/customers/:customerId/credit-applications/"),
    ).toBe("POST /customers/:param/credit-applications");
    expect(
      endpointKey("GET", "/customers/{{resources.customerId}}/loans/:loanId"),
    ).toBe("GET /customers/:param/loans/:param");
  });

  it("agrupa por endpoint, suma los pasos del mismo nodo y omite los que no tienen", () => {
    const run = runFixture({
      steps: [
        {
          ...counts(2, 1),
          stepKey: "a",
          workflowStepCode: "x",
          endpoint: "POST /auth/login",
        },
        {
          ...counts(1, 0),
          stepKey: "b",
          workflowStepCode: "y",
          endpoint: "POST /auth/login",
        },
        { ...counts(3, 0), stepKey: "c", endpoint: null },
      ],
    });
    const byEndpoint = stepCountsByEndpoint(run);

    expect([...byEndpoint.keys()]).toEqual(["POST /auth/login"]);
    expect(byEndpoint.get("POST /auth/login")).toMatchObject({
      passed: 3,
      failed: 1,
    });
    expect(run.steps[0].passed).toBe(2);
  });
});
