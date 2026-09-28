import { describe, expect, it } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import {
  OUTCOME_BACKLOG_ROLES,
  RATING_OPERATE_ROLES,
  describeCustomerRating,
  describeLoanRating,
  describeSweep,
  isDatabaseId,
  ratingErrorMessage,
} from "@/features/portfolio-operations/access";

const error = (status: number, message: string) =>
  new AtlasApiError({ status, code: "X", message });

describe("quién recalifica y quién ve los agotados", () => {
  it("copia los @Roles del backend: cumplimiento lee pero no recalifica", () => {
    expect(RATING_OPERATE_ROLES).not.toContain("compliance_analyst");
    expect(RATING_OPERATE_ROLES).toContain("internal_operator");
    expect(OUTCOME_BACKLOG_ROLES).toEqual([
      "risk_analyst",
      "admin",
      "platform_admin",
    ]);
  });
});

describe("isDatabaseId", () => {
  it("sólo enteros positivos sin ceros delante", () => {
    expect(isDatabaseId("42")).toBe(true);
    expect(isDatabaseId(" 42 ")).toBe(true);
    expect(isDatabaseId("0")).toBe(false);
    expect(isDatabaseId("042")).toBe(false);
    expect(isDatabaseId("L-7")).toBe(false);
    expect(isDatabaseId("")).toBe(false);
  });
});

describe("lo que se dice tras recalificar", () => {
  it("el barrido dice cuántos y cuáles fallaron", () => {
    expect(
      describeSweep({
        customers: 10,
        rated: 8,
        failed: 2,
        failedCustomerIds: ["5", "9"],
      }),
    ).toBe(
      "Se recorrieron 10 clientes con deuda viva: 8 calificados y 2 fallaron (clientes 5, 9).",
    );
    expect(describeSweep({ customers: 3, rated: 3, failed: 0 })).toMatch(
      /ninguno falló/,
    );
  });

  it("un crédito y un cliente, con su categoría", () => {
    expect(
      describeLoanRating("7", {
        loanRating: { grade: "B", gradeLabel: "Con atraso" },
        customerRating: { grade: "C" },
      }),
    ).toBe(
      "Crédito 7 recalificado: categoría B (Con atraso). Su titular quedó en categoría C.",
    );
    expect(
      describeCustomerRating("9", {
        loanRatings: [{}, {}],
        customerRating: { grade: "A", gradeLabel: "Normal" },
      }),
    ).toMatch(/Cliente 9 recalificado: categoría A \(Normal\), con 2 deudas/);
  });

  it("los errores conocidos, sin códigos", () => {
    expect(ratingErrorMessage(error(404, "LOAN_NOT_FOUND"), "crédito")).toBe(
      "No existe un crédito con ese número.",
    );
    expect(
      ratingErrorMessage(error(422, "RATING_POLICY_NOT_ACTIVE"), "cartera"),
    ).toMatch(/No hay matriz de calificación vigente/);
    expect(ratingErrorMessage(error(403, "Forbidden"), "cliente")).toMatch(
      /no tiene permiso/,
    );
    expect(ratingErrorMessage(new Error("red"), "cliente")).toBe(
      "No se pudo recalificar el cliente.",
    );
  });
});
