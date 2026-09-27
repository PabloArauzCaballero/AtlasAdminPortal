import { describe, expect, it } from "vitest";
import {
  canonicalStatus,
  eligibilityDecisionOptions,
  firstAllowedDecision,
  isDecisionAllowed,
} from "@/features/operations-cases/eligibility-options";

/**
 * El desplegable de habilitación sólo ofrece lo que la máquina de estados del cliente acepta.
 *
 * El servidor rechaza una transición ilegal con 422; aquí se fija que la pantalla no la ofrezca y
 * que diga por qué, con las mismas reglas que `customer-lifecycle.constants.ts` del backend.
 */
describe("eligibility-options", () => {
  it("en revisión se puede aprobar, observar y rechazar, pero no suspender ni reincorporar", () => {
    expect(isDecisionAllowed("under_review", "approve")).toBe(true);
    expect(isDecisionAllowed("under_review", "observe")).toBe(true);
    expect(isDecisionAllowed("under_review", "reject")).toBe(true);
    expect(isDecisionAllowed("under_review", "suspend")).toBe(false);
    expect(isDecisionAllowed("under_review", "reinstate")).toBe(false);
  });

  it("un rechazado o bloqueado sólo vuelve a revisión, nunca directo a activo", () => {
    for (const status of ["rejected", "blocked"]) {
      expect(isDecisionAllowed(status, "approve")).toBe(false);
      expect(isDecisionAllowed(status, "reinstate")).toBe(true);
      expect(firstAllowedDecision(status)).toBe("reinstate");
    }
  });

  it("un activo puede reaprobarse (idempotente) y suspenderse", () => {
    expect(isDecisionAllowed("active", "approve")).toBe(true);
    expect(isDecisionAllowed("active", "suspend")).toBe(true);
    expect(isDecisionAllowed("active", "reject")).toBe(false);
  });

  it("cerrado es terminal: no hay decisión posible", () => {
    expect(firstAllowedDecision("closed")).toBeNull();
    expect(
      eligibilityDecisionOptions("closed").every((option) => option.disabled),
    ).toBe(true);
  });

  it("las opciones ilegales llevan el motivo en la descripción", () => {
    const suspend = eligibilityDecisionOptions("under_review").find(
      (option) => option.value === "suspend",
    );
    expect(suspend?.disabled).toBe(true);
    expect(suspend?.description).toMatch(/No se puede desde «En revisión»/);
  });

  it("los estados anteriores a la máquina canónica se traducen, y lo desconocido cae al más restrictivo", () => {
    expect(canonicalStatus("pending_review")).toBe("under_review");
    expect(canonicalStatus("approved_for_next_step")).toBe("active");
    expect(canonicalStatus("inventado")).toBe("registered");
    expect(canonicalStatus(null)).toBe("registered");
  });
});
