import { describe, expect, it } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import {
  decisionOutcomeLabel,
  decisionReasonLabel,
  networkStatusLabel,
  onboardingStatusLabel,
  partnerActionErrorMessage,
  qrKindLabel,
  qrStatusLabel,
} from "@/features/partner-decisions/labels";
import { partnerStatusTone } from "@/features/partner-decisions/partner-status-badge";

const error = (status: number, code: string, message: string) =>
  new AtlasApiError({ status, code, message });

describe("etiquetas del expediente de comercio", () => {
  it("traduce los estados del expediente, el veredicto y los QR", () => {
    expect(onboardingStatusLabel("under_review")).toBe("En revisión");
    expect(onboardingStatusLabel("approved")).toBe("Aprobado");
    expect(decisionOutcomeLabel("REVISION_MANUAL")).toBe("Revisión manual");
    expect(decisionOutcomeLabel("APROBADO")).toBe("Aprobado");
    expect(qrStatusLabel("pending_review")).toBe("Pendiente de revisión");
    expect(networkStatusLabel("retired")).toBe("Retirado");
    expect(qrKindLabel("bank")).toBe("QR bancario (cobro)");
    expect(decisionReasonLabel("DECISION_MANUAL_PORTAL")).toBe(
      "Decisión manual desde este portal",
    );
  });

  it("un código desconocido no desaparece, pero tampoco se lee como palabra", () => {
    expect(onboardingStatusLabel("frozen")).toBe("Otro estado (frozen)");
    expect(onboardingStatusLabel(null)).toBe("Sin estado");
    expect(decisionReasonLabel("KYB_SENALES")).toBe("KYB_SENALES");
  });

  it("el color sale del código, no de la etiqueta", () => {
    expect(partnerStatusTone("approved")).toBe("success");
    expect(partnerStatusTone("RECHAZADO")).toBe("critical");
    expect(partnerStatusTone("under_review")).toBe("warning");
    expect(partnerStatusTone(null)).toBe("muted");
  });
});

describe("partnerActionErrorMessage", () => {
  const respaldo = "No se pudo registrar la decisión.";

  it("reescribe los 409 conocidos sin el código delante", () => {
    const delegado = partnerActionErrorMessage(
      error(
        409,
        "CONFLICT",
        "PARTNER_DECISION_DELEGADA_AL_MOTOR: el caso MRC-3 se resuelve en el Motor.",
      ),
      respaldo,
    );
    expect(delegado).toMatch(/caso abierto en el Motor/);
    expect(delegado).not.toMatch(/PARTNER_/);

    expect(
      partnerActionErrorMessage(
        error(409, "CONFLICT", "PARTNER_NOT_UNDER_REVIEW: está en approved."),
        respaldo,
      ),
    ).toMatch(/ya no está en revisión/);
  });

  it("el Motor caído y la falta de permiso se dicen en palabras", () => {
    expect(
      partnerActionErrorMessage(
        error(503, "SERVICE_UNAVAILABLE", "DECISION_ENGINE_UNAVAILABLE"),
        respaldo,
      ),
    ).toMatch(/El Motor no respondió/);
    expect(
      partnerActionErrorMessage(error(403, "FORBIDDEN", "x"), respaldo),
    ).toMatch(/no tiene permiso/);
  });

  it("otro error de la API enseña su mensaje; lo que no es de la API, el respaldo", () => {
    expect(
      partnerActionErrorMessage(
        error(422, "UNPROCESSABLE", "Falta el motivo"),
        respaldo,
      ),
    ).toBe("Falta el motivo");
    expect(partnerActionErrorMessage(new Error("red"), respaldo)).toBe(
      respaldo,
    );
  });
});
