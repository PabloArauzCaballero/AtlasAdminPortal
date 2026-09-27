import { describe, expect, it } from "vitest";
import {
  buildReviewBody,
  MAX_REASON,
  reasonError,
} from "@/features/review-queue/review-decision-dialog";

describe("buildReviewBody", () => {
  it("recorta el motivo y lo manda en notes", () => {
    expect(buildReviewBody("NEEDS_REVIEW", "  revisar tipo  ")).toEqual({
      reviewStatus: "NEEDS_REVIEW",
      confidenceLevel: "MEDIUM",
      notes: "revisar tipo",
    });
  });

  it("nunca pasa del tope del servidor", () => {
    const body = buildReviewBody("APPROVED", "x".repeat(MAX_REASON + 50));
    expect(body.notes).toHaveLength(MAX_REASON);
  });
});

describe("reasonError", () => {
  it("sólo el rechazo exige motivo", () => {
    expect(reasonError("REJECTED", "  ")).toMatch(/motivo/);
    expect(reasonError("REJECTED", "motivo claro")).toBeUndefined();
    expect(reasonError("APPROVED", "")).toBeUndefined();
    expect(reasonError("NEEDS_REVIEW", "")).toBeUndefined();
  });
});
