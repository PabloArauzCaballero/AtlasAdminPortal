import { describe, expect, it } from "vitest";
import {
  acceptanceFormSchema,
  decisionFormSchema,
  productFormDefaults,
  productFormSchema,
  toCreateProductBody,
  withoutBlank,
  type ProductForm,
} from "@/features/credit/credit-schemas";
import { toAcceptanceBody } from "@/features/credit/business-acceptance-panel";

function product(overrides: Partial<ProductForm> = {}): ProductForm {
  return {
    ...productFormDefaults,
    productCode: "consumo_12m",
    productName: "Consumo 12 meses",
    minAmount: "500",
    maxAmount: "5000",
    minTermMonths: "3",
    maxTermMonths: "12",
    ...overrides,
  };
}

function fieldErrors(result: { success: boolean; error?: unknown }) {
  if (result.success) return {};
  const issues = (
    result.error as { issues: Array<{ path: unknown[]; message: string }> }
  ).issues;
  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0]), issue.message]),
  );
}

describe("productFormSchema · espejo de createCreditProductSchema", () => {
  it("acepta un producto mínimo válido", () => {
    expect(productFormSchema.safeParse(product()).success).toBe(true);
  });

  it("el código sólo admite minúsculas, dígitos, guion y guion bajo", () => {
    const errors = fieldErrors(
      productFormSchema.safeParse(product({ productCode: "Consumo 12" })),
    );
    expect(errors.productCode).toMatch(/minúsculas/);
  });

  it("el error de rango incoherente cae en el campo del máximo", () => {
    const errors = fieldErrors(
      productFormSchema.safeParse(
        product({ minAmount: "5000", maxAmount: "500" }),
      ),
    );
    expect(errors.maxAmount).toMatch(/menor que el mínimo/);
  });

  it("plazos: enteros entre 1 y 360, y el máximo no por debajo del mínimo", () => {
    expect(
      fieldErrors(
        productFormSchema.safeParse(product({ minTermMonths: "2.5" })),
      ).minTermMonths,
    ).toBeDefined();
    expect(
      fieldErrors(
        productFormSchema.safeParse(product({ maxTermMonths: "361" })),
      ).maxTermMonths,
    ).toBeDefined();
    expect(
      fieldErrors(
        productFormSchema.safeParse(
          product({ minTermMonths: "24", maxTermMonths: "12" }),
        ),
      ).maxTermMonths,
    ).toMatch(/plazo máximo/);
  });

  it("la tasa y el ingreso mínimo son opcionales, pero si vienen deben ser números válidos", () => {
    expect(
      productFormSchema.safeParse(product({ annualInterestRate: "" })).success,
    ).toBe(true);
    expect(
      fieldErrors(
        productFormSchema.safeParse(product({ annualInterestRate: "abc" })),
      ).annualInterestRate,
    ).toBeDefined();
    expect(
      fieldErrors(
        productFormSchema.safeParse(product({ minMonthlyIncome: "-1" })),
      ).minMonthlyIncome,
    ).toBeDefined();
  });

  it("la vigencia no puede terminar antes de empezar", () => {
    const errors = fieldErrors(
      productFormSchema.safeParse(
        product({ effectiveFrom: "2026-10-01", effectiveUntil: "2026-09-01" }),
      ),
    );
    expect(errors.effectiveUntil).toBeDefined();
  });
});

describe("toCreateProductBody · del formulario al cuerpo estricto del backend", () => {
  it("convierte a números, pasa la moneda a mayúsculas y omite los opcionales vacíos", () => {
    const body = toCreateProductBody(product({ currencyCode: "bob" }));
    expect(body).toEqual({
      productCode: "consumo_12m",
      productName: "Consumo 12 meses",
      currencyCode: "BOB",
      minAmount: 500,
      maxAmount: 5000,
      minTermMonths: 3,
      maxTermMonths: 12,
      requiresManualReview: false,
    });
  });

  it("incluye tasa, ingreso, revisión humana y fechas ISO cuando se rellenan", () => {
    const body = toCreateProductBody(
      product({
        description: "  Para compras en comercio  ",
        annualInterestRate: "24.5",
        minMonthlyIncome: "2500",
        requiresManualReview: "yes",
        effectiveFrom: "2026-10-01",
        effectiveUntil: "2027-10-01",
      }),
    );
    expect(body).toMatchObject({
      description: "Para compras en comercio",
      annualInterestRate: 24.5,
      minMonthlyIncome: 2500,
      requiresManualReview: true,
      effectiveFrom: "2026-10-01T00:00:00.000Z",
      effectiveUntil: "2027-10-01T00:00:00.000Z",
    });
  });
});

describe("decisionFormSchema · la decisión negativa exige nota", () => {
  it("aprobar no exige nota", () => {
    expect(
      decisionFormSchema.safeParse({
        decision: "approve",
        reasonCode: "manual_review_complete",
        notes: "",
      }).success,
    ).toBe(true);
  });

  it.each(["reject", "request_more_information"] as const)(
    "%s sin nota falla en el campo nota",
    (decision) => {
      const errors = fieldErrors(
        decisionFormSchema.safeParse({
          decision,
          reasonCode: "x",
          notes: "  ",
        }),
      );
      expect(errors.notes).toMatch(/exige una nota/);
    },
  );

  it("el motivo es obligatorio", () => {
    const errors = fieldErrors(
      decisionFormSchema.safeParse({
        decision: "approve",
        reasonCode: "",
        notes: "",
      }),
    );
    expect(errors.reasonCode).toBeDefined();
  });
});

describe("acceptanceFormSchema · declinar exige motivo", () => {
  it("aceptar sin motivo vale y el cuerpo no lleva cadenas vacías", () => {
    const parsed = acceptanceFormSchema.parse({
      choice: "accept",
      reasonCode: "",
      notes: "",
    });
    expect(toAcceptanceBody(parsed)).toEqual({ accepted: true });
  });

  it("declinar sin motivo falla en el campo motivo", () => {
    const errors = fieldErrors(
      acceptanceFormSchema.safeParse({
        choice: "decline",
        reasonCode: "",
        notes: "",
      }),
    );
    expect(errors.reasonCode).toMatch(/exige un motivo/);
  });

  it("declinar con motivo produce accepted=false con el motivo", () => {
    const parsed = acceptanceFormSchema.parse({
      choice: "decline",
      reasonCode: "commercial_policy",
      notes: "Sin stock",
    });
    expect(toAcceptanceBody(parsed)).toEqual({
      accepted: false,
      reasonCode: "commercial_policy",
      notes: "Sin stock",
    });
  });
});

describe("withoutBlank", () => {
  it("quita las cadenas vacías y conserva el resto", () => {
    expect(withoutBlank({ a: "", b: " ", c: "x", d: 0 })).toEqual({
      c: "x",
      d: 0,
    });
  });
});
