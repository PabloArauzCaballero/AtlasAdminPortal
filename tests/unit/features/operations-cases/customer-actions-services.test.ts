import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cada acción llega a la ruta y con el cuerpo que el servidor valida (esquemas Zod estrictos:
 * un campo de más es un 400). Se fijan ruta, método, cuerpo y clave de idempotencia.
 */
vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const { apiRequest } = await import("@/shared/api/client");
const services =
  await import("@/features/operations-cases/customer-actions-services");

describe("customer-actions-services", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockResolvedValue({});
  });

  it("cribado: POST sin cuerpo a la ruta de cumplimiento", async () => {
    await services.runComplianceScreening("900");
    expect(apiRequest).toHaveBeenCalledWith(
      "/operations/customers/900/compliance/screening",
      { method: "POST" },
    );
  });

  it("descarte: motivo y nota en el cuerpo", async () => {
    await services.clearComplianceMatches("900", {
      reasonCode: "false_positive",
      notes: "Homónimo",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/operations/customers/900/compliance/clear-matches",
      {
        method: "POST",
        body: { reasonCode: "false_positive", notes: "Homónimo" },
      },
    );
  });

  it("habilitación: decisión en la ruta de operaciones", async () => {
    await services.decideEligibility("900", {
      decision: "observe",
      reasonCode: "doc",
      notes: "Falta dorso",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/operations/customers/900/eligibility/decision",
      {
        method: "POST",
        body: { decision: "observe", reasonCode: "doc", notes: "Falta dorso" },
      },
    );
  });

  it("comportamiento: lectura normal y recálculo con recalcular=1", async () => {
    await services.getBehaviorSummary("900");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/operations/customers/900/behavior-summary",
      {},
    );
    await services.getBehaviorSummary("900", true);
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/operations/customers/900/behavior-summary",
      { query: { recalcular: "1" } },
    );
  });

  it("riesgo: manual_recheck desde el panel, con clave de idempotencia", async () => {
    await services.recalculateRisk("900");
    const [path, options] = vi.mocked(apiRequest).mock.calls[0]!;
    expect(path).toBe("/customers/900/risk-assessments");
    expect(options).toMatchObject({
      method: "POST",
      body: { assessmentType: "manual_recheck", channel: "operations_panel" },
    });
    expect(
      (options as { headers: Record<string, string> }).headers[
        "x-idempotency-key"
      ],
    ).toMatch(/^risk-recheck-/);
  });
});
