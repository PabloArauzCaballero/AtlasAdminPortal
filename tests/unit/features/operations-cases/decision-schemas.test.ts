import { describe, expect, it } from "vitest";
import {
  fraudDefaults,
  fraudSchema,
  manualReviewDefaults,
  manualReviewSchema,
  toFraudInput,
  toManualReviewInput,
} from "@/features/operations-cases/decision-schemas";

describe("manualReviewSchema · motivo siempre obligatorio", () => {
  it("rechaza sin código de motivo", () => {
    const result = manualReviewSchema.safeParse({
      ...manualReviewDefaults,
      reasonCode: "",
    });
    expect(result.success).toBe(false);
  });

  it("acepta 'approved' con motivo y sin notas", () => {
    const result = manualReviewSchema.safeParse({
      ...manualReviewDefaults,
      decision: "approved",
      reasonCode: "identity_verified",
    });
    expect(result.success).toBe(true);
  });
});

describe("manualReviewSchema · notas condicionales", () => {
  it.each(["rejected", "request_more_information"] as const)(
    "exige notas al %s",
    (decision) => {
      const result = manualReviewSchema.safeParse({
        ...manualReviewDefaults,
        decision,
        reasonCode: "motivo",
        notes: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("notes");
      }
    },
  );

  it("acepta rejected cuando SÍ hay notas", () => {
    const result = manualReviewSchema.safeParse({
      ...manualReviewDefaults,
      decision: "rejected",
      reasonCode: "insufficient_documents",
      notes: "Documento ilegible, se solicita reenvío.",
    });
    expect(result.success).toBe(true);
  });

  it("no exige notas para 'no_action'", () => {
    const result = manualReviewSchema.safeParse({
      ...manualReviewDefaults,
      decision: "no_action",
      reasonCode: "sin_cambios",
      notes: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("toManualReviewInput", () => {
  it("notas vacías → undefined; 'sin cambio' → undefined", () => {
    const input = toManualReviewInput({
      ...manualReviewDefaults,
      reasonCode: "  ok  ",
      notes: "   ",
      nextCustomerStatus: "",
    });
    expect(input.notes).toBeUndefined();
    expect(input.nextCustomerStatus).toBeUndefined();
    expect(input.reasonCode).toBe("ok");
  });

  it("propaga el próximo estado cuando se eligió", () => {
    const input = toManualReviewInput({
      ...manualReviewDefaults,
      reasonCode: "ok",
      nextCustomerStatus: "approved_for_next_step",
    });
    expect(input.nextCustomerStatus).toBe("approved_for_next_step");
  });
});

describe("fraudSchema · motivo condicional", () => {
  it.each(["confirmed_fraud", "blocked"] as const)(
    "exige motivo al %s",
    (decision) => {
      const result = fraudSchema.safeParse({
        ...fraudDefaults,
        decision,
        reasonCode: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("reasonCode");
      }
    },
  );

  it("no exige motivo para 'needs_more_investigation'", () => {
    const result = fraudSchema.safeParse({
      ...fraudDefaults,
      decision: "needs_more_investigation",
      reasonCode: "",
    });
    expect(result.success).toBe(true);
  });

  it("acepta confirmed_fraud con motivo", () => {
    const result = fraudSchema.safeParse({
      ...fraudDefaults,
      decision: "confirmed_fraud",
      reasonCode: "chargeback_ring",
    });
    expect(result.success).toBe(true);
  });
});

describe("toFraudInput", () => {
  it("conserva applyWatchlist y descarta campos vacíos", () => {
    const input = toFraudInput({
      ...fraudDefaults,
      decision: "confirmed_fraud",
      reasonCode: "chargeback_ring",
      applyWatchlist: true,
      notes: "",
      nextCustomerStatus: "blocked",
    });
    expect(input.applyWatchlist).toBe(true);
    expect(input.notes).toBeUndefined();
    expect(input.reasonCode).toBe("chargeback_ring");
    expect(input.nextCustomerStatus).toBe("blocked");
  });

  it("motivo vacío (decisión que no lo exige) → undefined", () => {
    const input = toFraudInput({
      ...fraudDefaults,
      decision: "false_positive",
      reasonCode: "  ",
    });
    expect(input.reasonCode).toBeUndefined();
  });
});
