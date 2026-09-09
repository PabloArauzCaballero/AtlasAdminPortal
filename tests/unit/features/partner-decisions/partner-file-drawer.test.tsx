import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { PartnerFileDrawer } =
  await import("@/features/partner-decisions/partner-file-drawer");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const EXPEDIENTE = {
  partnerId: "10",
  legalName: "Comercial Andina S.R.L.",
  tradeName: "Andina",
  taxId: "123456",
  onboardingStatus: "under_review",
  submittedAt: "2026-09-01T00:00:00.000Z",
};

function estadoCon(decision: Record<string, unknown> | null) {
  return {
    data: {
      profile: {
        ...EXPEDIENTE,
        mdrRatePercent: "3.50",
        decision,
      },
      gaps: [],
      readyToSubmit: true,
      branches: [],
      qrCodes: [],
      posTerminals: [],
    },
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("PartnerFileDrawer — quién decidió manda sobre qué se ofrece", () => {
  it("con caso abierto en el Motor NO ofrece aprobar ni rechazar", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(
          estadoCon({
            executionId: "exec-1",
            outcome: "REVISION_MANUAL",
            reason: "KYB_SENALES_OPERATIVAS",
            artifactVersionId: "9",
            manualReviewCaseCode: "MRC-3",
            evaluatedAt: "2026-09-08T00:00:00.000Z",
          }),
        ),
      ),
    );

    renderWithProviders(
      <PartnerFileDrawer expediente={EXPEDIENTE} onClose={() => {}} />,
    );

    await waitFor(() => expect(screen.getByText("MRC-3")).toBeInTheDocument());
    // Dos bandejas para el mismo expediente producen dos veredictos: aquí no se decide.
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rechazar" })).toBeNull();
    expect(
      screen.getByRole("button", { name: /volver a pedir la verificación/i }),
    ).toBeInTheDocument();
  });

  it("sin caso del Motor la decisión manual sigue disponible: es la degradación", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(
          estadoCon({
            executionId: "exec-2",
            outcome: "REVISION_MANUAL",
            reason: "KYB_SENALES_OPERATIVAS",
            artifactVersionId: "9",
            manualReviewCaseCode: null,
            evaluatedAt: "2026-09-08T00:00:00.000Z",
          }),
        ),
      ),
    );

    renderWithProviders(
      <PartnerFileDrawer expediente={EXPEDIENTE} onClose={() => {}} />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Aprobar" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Decidió el Motor")).toBeInTheDocument();
  });

  it("sin veredicto lo dice, en vez de dejar el hueco en blanco", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(estadoCon(null)),
      ),
    );

    renderWithProviders(
      <PartnerFileDrawer expediente={EXPEDIENTE} onClose={() => {}} />,
    );

    await waitFor(() =>
      expect(screen.getByText(/Sin veredicto del Motor/)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeInTheDocument();
  });
});
