import { describe, expect, it } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import {
  applicationCodeFromCaseCode,
  creditCaseHref,
  creditErrorMessage,
  decisionAvailability,
  isCreditReviewCase,
  isDuplicatedProductCode,
  reviewBelongsToEngine,
} from "@/features/credit/credit-rules";
import type { CreditApplication } from "@/features/credit/types";

function application(
  overrides: Partial<CreditApplication> = {},
): CreditApplication {
  return {
    id: "77",
    applicationCode: "CA-2026-000077",
    customerId: "900",
    creditProductId: "21",
    partnerProfileId: null,
    requestedAmount: "1500.00",
    requestedTermMonths: 6,
    currencyCode: "BOB",
    purposeCode: null,
    status: "under_review",
    decisionExecutionId: null,
    decisionMode: null,
    decisionScore: null,
    decisionRiskBand: null,
    decisionPricedRate: null,
    decisionPricingTier: null,
    decisionReasonCode: null,
    manualReviewCaseCode: "CR-CA-2026-000077",
    manualReviewCaseSource: "atlas",
    businessAcceptance: null,
    businessAcceptanceAt: null,
    businessAcceptanceBy: null,
    businessAcceptanceReasonCode: null,
    businessAcceptanceNotes: null,
    decidedAt: null,
    decisionValidUntil: null,
    submittedAt: "2026-09-20T10:00:00.000Z",
    ...overrides,
  };
}

function conflict(message: string) {
  return new AtlasApiError({ status: 409, code: "CONFLICT", message });
}

describe("reviewBelongsToEngine · mismo criterio que credit-decision.service", () => {
  it("manda la fuente del caso cuando la hay", () => {
    expect(
      reviewBelongsToEngine(application({ manualReviewCaseSource: "engine" })),
    ).toBe(true);
    expect(
      reviewBelongsToEngine(
        application({
          manualReviewCaseSource: "atlas",
          decisionExecutionId: "exec-1",
          decisionMode: "decision_engine",
        }),
      ),
    ).toBe(false);
  });

  it("sin fuente (filas antiguas) decide por ejecución + modo del motor", () => {
    expect(
      reviewBelongsToEngine(
        application({
          manualReviewCaseSource: null,
          decisionExecutionId: "exec-1",
          decisionMode: "decision_engine",
        }),
      ),
    ).toBe(true);
    expect(
      reviewBelongsToEngine(application({ manualReviewCaseSource: null })),
    ).toBe(false);
  });
});

describe("decisionAvailability", () => {
  it("una solicitud abierta con caso de Atlas se decide aquí", () => {
    expect(decisionAvailability(application())).toEqual({ kind: "decide" });
  });

  it("una solicitud cerrada no admite otra decisión", () => {
    for (const status of ["approved", "rejected", "cancelled", "expired"])
      expect(decisionAvailability(application({ status }))).toEqual({
        kind: "closed",
      });
  });

  it("una revisión del Motor lleva a su ejecución", () => {
    expect(
      decisionAvailability(
        application({
          manualReviewCaseSource: "engine",
          decisionExecutionId: "exec-9",
        }),
      ),
    ).toEqual({ kind: "engine", executionId: "exec-9" });
  });
});

describe("casos CR de la cola de trabajo", () => {
  it("se reconocen por el tipo de caso o por el prefijo del código", () => {
    expect(
      isCreditReviewCase({
        reasonCode: "credit_application_review",
        caseCode: "X",
      }),
    ).toBe(true);
    expect(isCreditReviewCase({ reasonCode: null, caseCode: "CR-CA-1" })).toBe(
      true,
    );
    expect(
      isCreditReviewCase({
        reasonCode: "risk_assessment_review",
        caseCode: "MR-1",
      }),
    ).toBe(false);
  });

  it("del código del caso sale el de la solicitud", () => {
    expect(applicationCodeFromCaseCode("CR-CA-2026-000077")).toBe(
      "CA-2026-000077",
    );
    expect(applicationCodeFromCaseCode("CR-")).toBeNull();
    expect(applicationCodeFromCaseCode("MR-1")).toBeNull();
    expect(applicationCodeFromCaseCode(null)).toBeNull();
  });

  it("el enlace lleva cliente y caso; sin cliente no hay enlace", () => {
    expect(creditCaseHref({ caseCode: "CR-CA-7", customerId: "900" })).toBe(
      "/internal/operations/credit/applications/from-case?customerId=900&caseCode=CR-CA-7",
    );
    expect(
      creditCaseHref({ caseCode: "CR-CA-7", customerId: null }),
    ).toBeNull();
  });
});

describe("creditErrorMessage · el 409 dice qué hacer", () => {
  it("traduce los códigos de negocio que llegan al principio del mensaje", () => {
    expect(
      creditErrorMessage(conflict("CREDIT_APPLICATION_ALREADY_DECIDED"), "x"),
    ).toMatch(/ya estaba resuelta/);
    expect(
      creditErrorMessage(
        conflict(
          "CREDIT_DECISION_DELEGADA_AL_MOTOR: la solicitud CA-1 la decidió…",
        ),
        "x",
      ),
    ).toMatch(/Motor de decisiones/);
    expect(
      creditErrorMessage(
        conflict(
          "CREDIT_BUSINESS_ACCEPTANCE_NOT_PENDING: la solicitud está en accepted.",
        ),
        "x",
      ),
    ).toMatch(/ya no está pendiente/);
    expect(
      creditErrorMessage(
        new AtlasApiError({
          status: 503,
          code: "SERVICE_UNAVAILABLE",
          message: "DECISION_ENGINE_UNAVAILABLE",
        }),
        "x",
      ),
    ).toMatch(/no se tocó/);
  });

  it("un 403 explica el rol; lo desconocido se enseña tal cual; lo que no es de la API usa el texto de reserva", () => {
    expect(
      creditErrorMessage(
        new AtlasApiError({
          status: 403,
          code: "FORBIDDEN",
          message: "Forbidden resource",
        }),
        "x",
      ),
    ).toMatch(/rol/);
    expect(creditErrorMessage(conflict("OTRO_CODIGO"), "x")).toBe(
      "OTRO_CODIGO",
    );
    expect(creditErrorMessage(new Error("boom"), "reserva")).toBe("reserva");
  });

  it("reconoce el código de producto repetido para pintarlo en el campo", () => {
    expect(
      isDuplicatedProductCode(conflict("CREDIT_PRODUCT_CODE_ALREADY_EXISTS")),
    ).toBe(true);
    expect(isDuplicatedProductCode(conflict("OTRO"))).toBe(false);
  });
});
