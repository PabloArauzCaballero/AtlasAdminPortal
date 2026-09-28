import { describe, expect, it } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import {
  documentContentErrorText,
  identityDecisionErrorText,
  isIdentityReviewCase,
} from "@/features/operations-cases/identity-review-rules";

const err = (status: number, message = "x") =>
  new AtlasApiError({ status, code: "X", message });

describe("identity-review-rules", () => {
  it("reconoce el caso por tipo o por código", () => {
    expect(
      isIdentityReviewCase({ reasonCode: "identity_review", caseCode: null }),
    ).toBe(true);
    expect(
      isIdentityReviewCase({ reasonCode: null, caseCode: "MR-ID-1" }),
    ).toBe(true);
    expect(
      isIdentityReviewCase({
        reasonCode: "risk_assessment_review",
        caseCode: "MR-1",
      }),
    ).toBe(false);
  });

  it("un documento que no carga por permisos no se da por borrado", () => {
    expect(documentContentErrorText(err(403))).toMatch(/Tu rol/);
    expect(documentContentErrorText(err(404))).toMatch(/ya no está/);
    expect(documentContentErrorText(err(500))).not.toMatch(/ya no está/);
  });

  it("sin intento pendiente se explica en vez del código crudo", () => {
    expect(
      identityDecisionErrorText(
        err(404, "IDENTITY_VERIFICATION_ATTEMPT_NOT_FOUND"),
      ),
    ).toMatch(/no hay nada que decidir/);
  });
});
