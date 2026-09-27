import { HttpResponse, http } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
import { elegirOpcion } from "../../shared/option-select-helpers";

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { CreditApplicationDetailPage } =
  await import("@/features/credit/application-detail-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: Array<{ method: string; path: string; body: unknown }> = [];

function solicitud(overrides: Record<string, unknown> = {}) {
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
    decisionMode: "decision_engine",
    decisionScore: null,
    decisionRiskBand: "B",
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

function servir(application: Record<string, unknown>) {
  server.use(
    http.get(`${API_BASE}/operations/credit/applications/77`, () =>
      HttpResponse.json({
        data: {
          application,
          events: [
            {
              id: "1",
              eventType: "submitted",
              previousStatus: null,
              newStatus: "submitted",
              actorType: "customer",
              actorInternalUserId: null,
              reasonCode: "credit_application_submitted",
              notes: null,
              happenedAt: "2026-09-20T10:00:00.000Z",
            },
          ],
        },
      }),
    ),
  );
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", async ({ request }) => {
    const body =
      request.method === "GET"
        ? null
        : await request
            .clone()
            .json()
            .catch(() => null);
    peticiones.push({
      method: request.method,
      path: new URL(request.url).pathname.replace("/api/v1", ""),
      body,
    });
  });
});

beforeEach(() => {
  peticiones.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles: ["risk_analyst"],
    hasAnyRole: () => true,
    hasPermission: () => true,
  });
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("CreditApplicationDetailPage · decidir donde se resuelve el caso CR", () => {
  it("una revisión propia de Atlas se decide aquí, con confirmación y el cuerpo exacto", async () => {
    servir(solicitud());
    server.use(
      http.post(`${API_BASE}/operations/credit/applications/77/decision`, () =>
        HttpResponse.json({
          data: {
            applicationId: "77",
            decision: "approve",
            previousStatus: "under_review",
            status: "approved",
          },
        }),
      ),
    );
    renderWithProviders(<CreditApplicationDetailPage applicationId="77" />);

    await screen.findByRole("heading", { name: "Solicitud CA-2026-000077" });
    expect(screen.getByText("Solicitud enviada")).toBeInTheDocument();

    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Motivo/ }),
      "manual_review_complete",
    );
    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    // Nada sale sin confirmar: decidir no se deshace desde el portal.
    expect(peticiones.some((p) => p.method === "POST")).toBe(false);
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Aprobar" }),
    );

    await waitFor(() =>
      expect(peticiones).toContainEqual({
        method: "POST",
        path: "/operations/credit/applications/77/decision",
        body: { decision: "approve", reasonCode: "manual_review_complete" },
      }),
    );
    await screen.findByText(/Decisión registrada/);
  });

  it("rechazar sin nota se detiene en el campo, sin llamar a la API", async () => {
    servir(solicitud());
    renderWithProviders(<CreditApplicationDetailPage applicationId="77" />);
    await screen.findByRole("heading", { name: "Solicitud CA-2026-000077" });

    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Decisión/ }),
      "reject",
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Motivo/ }),
      "fraud_suspicion",
    );
    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(
      await screen.findByText(
        "Rechazar o pedir más información exige una nota.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(peticiones.some((p) => p.method === "POST")).toBe(false);
  });

  it("una revisión del Motor no ofrece decidir aquí", async () => {
    servir(
      solicitud({
        manualReviewCaseSource: "engine",
        decisionExecutionId: "exec-9",
      }),
    );
    renderWithProviders(<CreditApplicationDetailPage applicationId="77" />);
    await screen.findByText(/se resuelve en su/);
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
  });

  it("la aceptación pendiente se registra; declinar exige motivo", async () => {
    servir(
      solicitud({
        status: "approved",
        businessAcceptance: "pending",
        decidedAt: "2026-09-21T10:00:00.000Z",
      }),
    );
    server.use(
      http.post(
        `${API_BASE}/operations/credit/applications/77/business-acceptance`,
        () =>
          HttpResponse.json({
            data: {
              applicationId: "77",
              status: "rejected",
              businessAcceptance: "declined",
              businessAcceptanceAt: "2026-09-22T10:00:00.000Z",
            },
          }),
      ),
    );
    renderWithProviders(<CreditApplicationDetailPage applicationId="77" />);
    await screen.findByText(
      "La solicitud ya está resuelta; no admite otra decisión.",
    );

    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Respuesta del negocio/ }),
      "decline",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Declinar la operación" }),
    );
    expect(
      await screen.findByText(
        "Declinar una operación aprobada exige un motivo.",
      ),
    ).toBeInTheDocument();

    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Motivo/ }),
      "commercial_policy",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Declinar la operación" }),
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Declinar",
      }),
    );
    await waitFor(() =>
      expect(peticiones).toContainEqual({
        method: "POST",
        path: "/operations/credit/applications/77/business-acceptance",
        body: { accepted: false, reasonCode: "commercial_policy" },
      }),
    );
  });

  it("un 409 de solicitud ya decidida se explica, no se enseña el código", async () => {
    servir(solicitud());
    server.use(
      http.post(`${API_BASE}/operations/credit/applications/77/decision`, () =>
        HttpResponse.json(
          {
            requestId: "req-1",
            error: {
              code: "CONFLICT",
              message: "CREDIT_APPLICATION_ALREADY_DECIDED",
            },
            timestamp: "2026-09-26T00:00:00.000Z",
          },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<CreditApplicationDetailPage applicationId="77" />);
    await screen.findByRole("heading", { name: "Solicitud CA-2026-000077" });
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Motivo/ }),
      "manual_review_complete",
    );
    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Aprobar",
      }),
    );
    expect(
      await screen.findByText(/otra persona la decidió antes/),
    ).toBeInTheDocument();
  });
});
