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

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { CustomerPortfolioSection } =
  await import("@/features/loans/customer-portfolio-section");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const desembolsos: { cuerpo: unknown; llave: string | null }[] = [];
const peticiones: string[] = [];

function comoRoles(roles: string[]) {
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles,
    hasAnyRole: (req: string[]) => req.some((r) => roles.includes(r)),
    hasPermission: () => false,
  });
}

const solicitud = (over: Record<string, unknown>) => ({
  applicationId: "5",
  applicationCode: "APP-5",
  status: "approved",
  requestedAmount: "1200.00",
  requestedTermMonths: 3,
  currencyCode: "BOB",
  submittedAt: "2026-08-01T10:00:00.000Z",
  decidedAt: "2026-08-01T10:05:00.000Z",
  decisionReasonCode: null,
  businessAcceptance: "accepted",
  businessAcceptanceAt: "2026-08-01T11:00:00.000Z",
  ...over,
});

const prestamoDeSolicitud: {
  applicationId: string | null;
  loan: { loanId: string; loanCode: string };
} = { applicationId: null, loan: { loanId: "77", loanCode: "LOAN-77" } };

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) => {
    peticiones.push(
      `${request.method} ${new URL(request.url).pathname.replace("/api/v1", "")}`,
    );
  });
});

beforeEach(() => {
  desembolsos.length = 0;
  prestamoDeSolicitud.applicationId = null;
  peticiones.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  comoRoles(["internal_operator"]);
  server.use(
    http.get(`${API_BASE}/operations/customers/12/credit-rating`, () =>
      HttpResponse.json({
        data: {
          id: "1",
          customerId: "12",
          policyVersionId: "1",
          grade: "B",
          gradeLabel: "Con atraso leve",
          severityRank: 2,
          worstDaysPastDue: 12,
          ratedLoanCount: 1,
          totalExposureAmount: "800.00",
          totalProvisionAmount: "40.00",
          drivingLoanId: "77",
          previousGrade: "A",
          ratingReason: "dpd",
          isCurrent: true,
          ratedAt: "2026-09-20T00:00:00.000Z",
        },
      }),
    ),
    http.get(`${API_BASE}/customers/12/credit-applications`, () =>
      HttpResponse.json({
        data: {
          customerId: "12",
          applications: [
            solicitud({}),
            solicitud({
              applicationId: "6",
              applicationCode: "APP-6",
              businessAcceptance: "pending",
            }),
            solicitud({
              applicationId: "7",
              applicationCode: "APP-7",
              status: "rejected",
              businessAcceptance: null,
            }),
          ],
        },
      }),
    ),
    // La solicitud 5 todavía no tiene préstamo: por eso se ofrece «Desembolsar».
    http.get(`${API_BASE}/operations/loans`, ({ request }) => {
      const id = new URL(request.url).searchParams.get("creditApplicationId");
      const items =
        id === prestamoDeSolicitud.applicationId
          ? [prestamoDeSolicitud.loan]
          : [];
      return HttpResponse.json({
        data: { items, total: items.length, page: 1, pageSize: 1 },
      });
    }),
    http.get(`${API_BASE}/customers/12/loans`, () =>
      HttpResponse.json({ data: { items: [] } }),
    ),
    http.post(
      `${API_BASE}/credit-applications/5/disbursement`,
      async ({ request }) => {
        desembolsos.push({
          cuerpo: await request.json(),
          llave: request.headers.get("x-idempotency-key"),
        });
        return HttpResponse.json(
          {
            data: {
              loanId: "77",
              loanCode: "LOAN-77",
              status: "active",
              maturityDate: "2026-11-01",
            },
          },
          { status: 201 },
        );
      },
    ),
    http.get(`${API_BASE}/customers/12/spending-report.pdf`, () =>
      HttpResponse.text("%PDF-1.4", {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'inline; filename="atlas-gastos-12.pdf"',
        },
      }),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("CustomerPortfolioSection — la cartera en la ficha del cliente", () => {
  it("ofrece desembolsar sólo la solicitud aprobada y aceptada por el comercio", async () => {
    renderWithProviders(<CustomerPortfolioSection customerId="12" />);
    await waitFor(() => expect(screen.getByText("APP-7")).toBeInTheDocument());
    expect(
      await screen.findAllByRole("button", { name: "Desembolsar" }),
    ).toHaveLength(1);
    expect(screen.getByText("B · Con atraso leve")).toBeInTheDocument();
  });

  it("desembolsa con llave de idempotencia y enlaza al préstamo creado", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomerPortfolioSection customerId="12" />);
    await user.click(
      await screen.findByRole("button", { name: "Desembolsar" }),
    );
    const panel = await screen.findByRole("dialog");
    await user.click(
      within(panel).getByRole("button", { name: "Desembolsar" }),
    );

    await waitFor(() =>
      expect(within(panel).getByRole("status")).toHaveTextContent("LOAN-77"),
    );
    expect(
      within(panel).getByRole("link", { name: "Abrir el préstamo" }),
    ).toHaveAttribute("href", "/internal/operations/loans/77");
    expect(desembolsos).toHaveLength(1);
    expect(desembolsos[0].cuerpo).toEqual({});
    expect(desembolsos[0].llave).toBeTruthy();
  });

  it("la solicitud ya desembolsada enlaza a su préstamo y deja de ofrecer «Desembolsar»", async () => {
    prestamoDeSolicitud.applicationId = "5";
    renderWithProviders(<CustomerPortfolioSection customerId="12" />);
    const enlace = await screen.findByRole("link", {
      name: "Ver préstamo LOAN-77",
    });
    expect(enlace).toHaveAttribute("href", "/internal/operations/loans/77");
    expect(screen.queryByRole("button", { name: "Desembolsar" })).toBeNull();
    // Sólo se pregunta por las aprobadas: la rechazada no pudo originar préstamo.
    expect(
      peticiones.filter((p) => p.startsWith("GET /operations/loans")),
    ).toHaveLength(2);
  });

  it("un analista de riesgo ve la cartera pero no el botón de desembolso", async () => {
    comoRoles(["risk_analyst"]);
    renderWithProviders(<CustomerPortfolioSection customerId="12" />);
    await waitFor(() => expect(screen.getByText("APP-5")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Desembolsar" })).toBeNull();
  });

  it("cumplimiento ve la calificación y no pide préstamos (su rol no los lee)", async () => {
    comoRoles(["compliance_analyst"]);
    renderWithProviders(<CustomerPortfolioSection customerId="12" />);
    await waitFor(() =>
      expect(screen.getByText("B · Con atraso leve")).toBeInTheDocument(),
    );
    expect(peticiones).not.toContain("GET /customers/12/loans");
    expect(peticiones).not.toContain("GET /customers/12/credit-applications");
  });

  it("descarga el informe de gasto por la puerta autenticada", async () => {
    const user = userEvent.setup();
    const crear = vi.fn(() => "blob:informe");
    const revocar = vi.fn();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar }),
    );
    renderWithProviders(<CustomerPortfolioSection customerId="12" />);
    await user.click(
      await screen.findByRole("button", { name: /Informe de gasto/ }),
    );
    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    expect(peticiones).toContain("GET /customers/12/spending-report.pdf");
    vi.unstubAllGlobals();
  });
});
