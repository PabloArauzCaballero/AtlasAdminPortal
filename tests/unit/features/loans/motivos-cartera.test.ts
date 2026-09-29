import { describe, expect, it } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import { explicarErrorDeCartera } from "@/features/loans/loan-labels";
import { motivoDeCartera } from "@/features/loans/loan-forms";
import { reasonLabel } from "@/features/credit/credit-options";

const conflicto = (code: string) =>
  new AtlasApiError({ status: 409, code: "CONFLICT", message: code });

describe("errores de cartera que el desembolso promete comprobar", () => {
  it("consentimientos y línea salen en palabras, no como código", () => {
    for (const code of [
      "REQUIRED_CONSENT_MISSING",
      "CONSENT_REVOKED_AFTER_DECISION",
      "CONSENT_REVOCATION_PENDING_SYNC",
      "CREDIT_EXPOSURE_LIMIT_EXCEEDED",
      "CREDIT_LIMIT_UNKNOWN",
      "CREDIT_PRODUCT_WITHOUT_RATE",
      "DELINQUENCY_POLICY_NOT_PUBLISHED",
    ]) {
      expect(explicarErrorDeCartera(conflicto(code), "x")).not.toContain(code);
    }
  });

  it("el código largo gana al corto que contiene", () => {
    expect(
      explicarErrorDeCartera(conflicto("CREDIT_LIMIT_CURRENCY_MISMATCH"), "x"),
    ).toMatch(/línea del cliente/);
    expect(explicarErrorDeCartera(conflicto("CURRENCY_MISMATCH"), "x")).toMatch(
      /moneda del cobro/,
    );
  });
});

describe("motivos en palabras", () => {
  it("calificación y motivos desconocidos", () => {
    expect(motivoDeCartera("worst_operation")).toBe(
      "La peor de sus operaciones",
    );
    expect(motivoDeCartera("algo_nuevo")).toBe("Algo nuevo");
    expect(motivoDeCartera(null)).toBe("—");
  });

  it("los motivos de decisión de crédito usan las etiquetas de los formularios", () => {
    expect(reasonLabel("manual_review_complete")).not.toBe(
      "manual_review_complete",
    );
    expect(reasonLabel("R_INGRESO_BAJO")).toBe("R ingreso bajo");
  });
});
