import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";

/**
 * Cumplimiento, habilitación, comportamiento y riesgo en la ficha del cliente.
 *
 * Hasta 2026-09-26 las cinco rutas existían en el servidor y ninguna pantalla las llamaba: el
 * cribado de listas no se ejecutaba nunca (hallazgo A9). Se fija que cada acción llegue a su
 * servicio con el cuerpo que el servidor valida, que lo irreversible pida confirmación y que un 403
 * diga quién sí puede hacerlo.
 */
vi.mock("@/features/operations-cases/customer-actions-services", () => ({
  runComplianceScreening: vi.fn(),
  clearComplianceMatches: vi.fn(),
  decideEligibility: vi.fn(),
  getBehaviorSummary: vi.fn(),
  recalculateRisk: vi.fn(),
}));

// El rol de la sesión: por defecto `admin`, que el backend deja cribar y descartar.
const sesion = vi.hoisted(() => ({ role: "admin" }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    hasAnyRole: (roles: string[]) => roles.includes(sesion.role),
  }),
}));

const services =
  await import("@/features/operations-cases/customer-actions-services");
const { CustomerDecisionsPanel } =
  await import("@/features/operations-cases/customer-decisions-panel");
const { RecalculateRiskAction } =
  await import("@/features/operations-cases/recalculate-risk-action");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderPanel(status = "under_review") {
  return render(
    <CustomerDecisionsPanel customerId="900" currentStatus={status} />,
    { wrapper },
  );
}

describe("CustomerDecisionsPanel · botones por rol (el @Roles real del backend)", () => {
  it("operación NO ve «Ejecutar cribado» ni «Descartar» (el backend le da 403 en los dos)", () => {
    sesion.role = "internal_operator";
    renderPanel();
    expect(screen.queryByTestId("compliance-screen")).toBeNull();
    expect(screen.queryByTestId("clear-matches-submit")).toBeNull();
    expect(screen.getByTestId("compliance-screen-sin-rol")).toHaveTextContent(
      "cumplimiento, riesgo y administración",
    );
    sesion.role = "admin";
  });

  it("riesgo criba pero NO descarta coincidencias", () => {
    sesion.role = "risk_analyst";
    renderPanel();
    expect(screen.getByTestId("compliance-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("clear-matches-submit")).toBeNull();
    expect(screen.getByTestId("clear-matches-sin-rol")).toHaveTextContent(
      "cumplimiento y administración",
    );
    sesion.role = "admin";
  });

  it("cumplimiento hace las dos cosas", () => {
    sesion.role = "compliance_analyst";
    renderPanel();
    expect(screen.getByTestId("compliance-screen")).toBeInTheDocument();
    expect(screen.getByTestId("clear-matches-submit")).toBeInTheDocument();
    sesion.role = "admin";
  });
});

describe("CustomerDecisionsPanel", () => {
  beforeEach(() => {
    vi.mocked(services.getBehaviorSummary).mockReset();
    vi.mocked(services.getBehaviorSummary).mockResolvedValue(null);
    vi.mocked(services.runComplianceScreening).mockReset();
    vi.mocked(services.clearComplianceMatches).mockReset();
    vi.mocked(services.decideEligibility).mockReset();
    vi.mocked(services.recalculateRisk).mockReset();
  });

  it("ejecuta el cribado y enseña coincidencias y bloqueadores", async () => {
    vi.mocked(services.runComplianceScreening).mockResolvedValue({
      customerId: "900",
      candidatesEvaluated: 3,
      newMatches: 1,
      totalMatches: 1,
      lifecycleStatus: "under_review",
      eligible: false,
      blockers: [{ code: "COMPLIANCE_MATCH_PENDING" }],
    });
    renderPanel();
    fireEvent.click(screen.getByTestId("compliance-screen"));
    await waitFor(() =>
      expect(screen.getByText("1 coincidencia(s)")).toBeInTheDocument(),
    );
    expect(services.runComplianceScreening).toHaveBeenCalledWith("900");
    expect(
      screen.getByText("Coincidencia en listas restrictivas sin resolver"),
    ).toBeInTheDocument();
  });

  it("descartar coincidencias exige nota y manda motivo y nota", async () => {
    vi.mocked(services.clearComplianceMatches).mockResolvedValue({
      customerId: "900",
      clearedMatches: 2,
      eligible: true,
      blockers: [],
    });
    renderPanel();
    expect(screen.getByTestId("clear-matches-submit")).toBeDisabled();
    fireEvent.change(screen.getByTestId("clear-matches-notes"), {
      target: { value: "Homónimo: otra fecha de nacimiento" },
    });
    fireEvent.click(screen.getByTestId("clear-matches-submit"));
    await waitFor(() =>
      expect(services.clearComplianceMatches).toHaveBeenCalledWith("900", {
        reasonCode: "false_positive",
        notes: "Homónimo: otra fecha de nacimiento",
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/2 coincidencia\(s\) descartada\(s\)/),
      ).toBeInTheDocument(),
    );
  });

  it("un 403 del descarte dice quién sí puede hacerlo", async () => {
    vi.mocked(services.clearComplianceMatches).mockRejectedValue(
      new AtlasApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "Forbidden",
      }),
    );
    renderPanel();
    fireEvent.change(screen.getByTestId("clear-matches-notes"), {
      target: { value: "Homónimo" },
    });
    fireEvent.click(screen.getByTestId("clear-matches-submit"));
    await waitFor(() =>
      expect(
        screen.getByText(/Lo hacen cumplimiento y administración/),
      ).toBeInTheDocument(),
    );
  });

  it("la decisión de habilitación pide confirmación y manda la transición elegida", async () => {
    vi.mocked(services.decideEligibility).mockResolvedValue({
      customerId: "900",
      decision: "approve",
      previousStatus: "under_review",
      lifecycleStatus: "active",
      statusChanged: true,
      eligible: true,
      overriddenBlockers: [],
      blockers: [],
    });
    renderPanel("under_review");
    fireEvent.change(screen.getByTestId("eligibility-reason"), {
      target: { value: "kyc_completo" },
    });
    fireEvent.click(screen.getByTestId("eligibility-submit"));
    expect(services.decideEligibility).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    await waitFor(() =>
      expect(services.decideEligibility).toHaveBeenCalledWith("900", {
        decision: "approve",
        reasonCode: "kyc_completo",
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("El cliente pasó de «En revisión» a «Activo»."),
      ).toBeInTheDocument(),
    );
  });

  it("una decisión negativa no se ofrece sin nota", () => {
    renderPanel("under_review");
    fireEvent.click(screen.getByTestId("eligibility-decision"));
    fireEvent.click(screen.getByTestId("eligibility-decision-option-reject"));
    fireEvent.change(screen.getByTestId("eligibility-reason"), {
      target: { value: "riesgo_alto" },
    });
    expect(screen.getByTestId("eligibility-submit")).toBeDisabled();
  });

  it("desde un estado terminal no ofrece decisión", () => {
    renderPanel("closed");
    expect(screen.getByTestId("eligibility-none")).toBeInTheDocument();
  });

  it("sin resumen de comportamiento lo dice y permite recalcularlo", async () => {
    vi.mocked(services.getBehaviorSummary).mockImplementation(
      async (_id, recalcular) =>
        recalcular
          ? {
              completionTimeSeconds: 600,
              interScreenTimingJson: { detalle: { senales: ["pegado"] } },
              formErrorRate: 0.1,
              ciCopyPasteDetected: true,
              abandonmentCountPrior: 0,
              permissionGrantScore: 1,
              botLikelihoodScore: 0.15,
              computationVersion: "behavior-summary-v1",
              disponible: true,
              onboardingFlowId: "1",
              summaryId: "5",
              computedAt: "2026-09-26T10:00:00.000Z",
              disparador: "operations_read",
            }
          : null,
    );
    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("Sin resumen calculado")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("behavior-recalculate"));
    await waitFor(() => expect(screen.getByText("15 %")).toBeInTheDocument());
    expect(services.getBehaviorSummary).toHaveBeenLastCalledWith("900", true);
    expect(screen.getByText("pegado")).toBeInTheDocument();
  });
});

describe("RecalculateRiskAction", () => {
  it("no recalcula sin confirmar y enlaza a la corrida nueva", async () => {
    vi.mocked(services.recalculateRisk).mockResolvedValue({
      riskAssessmentRunId: "77",
      riskAssessmentResultId: "78",
      decision: "manual_review_required",
      riskLevel: "medium",
      manualReviewCaseId: "12",
    });
    render(<RecalculateRiskAction customerId="900" />, { wrapper });
    fireEvent.click(screen.getByTestId("recalculate-risk-open"));
    expect(services.recalculateRisk).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recalcular" }));
    await waitFor(() =>
      expect(screen.getByText("corrida #77")).toHaveAttribute(
        "href",
        "/internal/operations/risk-assessments/77",
      ),
    );
    expect(services.recalculateRisk).toHaveBeenCalledWith("900");
    expect(
      screen.getByText(/abrió el caso de revisión #12/),
    ).toBeInTheDocument();
  });
});
