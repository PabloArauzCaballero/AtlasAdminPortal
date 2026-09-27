import { describe, expect, it } from "vitest";
import {
  approvalBlocker,
  buildDecisionBatch,
  editableTarget,
  itemOutcomes,
  reasonProblem,
} from "@/features/operations/catalog-staging-logic";

const version = (status: string) => ({
  catalogVersionId: "9",
  versionCode: "v2",
  status,
  validFrom: null,
  validUntil: null,
});

const item = {
  stagingItemId: "1",
  catalogId: "3",
  ingestionJobId: "41",
  proposedItemCode: "BNB",
  proposedItemName: "Banco Nacional",
  proposedAttributes: {},
  aiSuggested: false,
  reviewStatus: "pending_review",
  reviewNotes: null,
};

describe("editableTarget", () => {
  it("sólo borrador o en aprobación reciben ítems", () => {
    expect(editableTarget(version("draft"))?.catalogVersionId).toBe("9");
    expect(editableTarget(version("pending_approval"))).not.toBeNull();
    expect(editableTarget(version("approved"))).toBeNull();
    expect(editableTarget(null)).toBeNull();
  });
});

describe("approvalBlocker", () => {
  it("exige código y nombre propuestos", () => {
    expect(approvalBlocker(item)).toBeNull();
    expect(approvalBlocker({ ...item, proposedItemCode: " " })).toMatch(
      /código/,
    );
    expect(approvalBlocker({ ...item, proposedItemName: null })).toMatch(
      /nombre/,
    );
  });
});

describe("reasonProblem y buildDecisionBatch", () => {
  it("motivo entre 5 y 2000 caracteres, recortado", () => {
    expect(reasonProblem("abc")).toMatch(/mínimo/);
    expect(reasonProblem("x".repeat(2001))).toMatch(/2000/);
    expect(
      buildDecisionBatch("9", ["1"], "reject", "  duplicado  ").decisions[0],
    ).toEqual({
      stagingItemId: "1",
      decision: "reject",
      decisionReason: "duplicado",
    });
  });
});

describe("itemOutcomes", () => {
  it("todo o nada: un fallo deja todos sin cambios", () => {
    expect(itemOutcomes([item], "approve", true)[0].outcome).toBe("approved");
    expect(itemOutcomes([item], "reject", true)[0].outcome).toBe("rejected");
    expect(itemOutcomes([item], "approve", false)[0].outcome).toBe(
      "not_applied",
    );
  });
});
