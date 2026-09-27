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
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const { CustomerCreditSection } =
  await import("@/features/credit/customer-credit-section");
const { ApplicationFromCasePage } =
  await import("@/features/credit/application-from-case-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: string[] = [];

const SOLICITUDES = {
  data: {
    customerId: "900",
    applications: [
      {
        applicationId: "77",
        applicationCode: "CA-2026-000077",
        status: "under_review",
        requestedAmount: "1500.00",
        requestedTermMonths: 6,
        currencyCode: "BOB",
        submittedAt: "2026-09-20T10:00:00.000Z",
        decidedAt: null,
        decisionReasonCode: null,
        businessAcceptance: null,
        businessAcceptanceAt: null,
      },
    ],
  },
};

const LINEA = {
  customerId: "900",
  currencyCode: "BOB",
  approvedLimit: 3000,
  used: 0,
  available: 3000,
  maxAffordableInstallment: 450,
  scoring: 640,
  scoringBand: { code: "bueno", label: "Bueno", tone: "info" },
  riskBand: "B",
  pricingTier: null,
  annualPercentageRate: 24,
  capacity: {
    recommendedLimit: 3000,
    bindingConstraint: "CAPACIDAD",
    evidence: "EXTRACTO",
    explanation: "Tu límite lo marca lo que tu extracto muestra.",
  },
  decision: {
    outcome: "APPROVE",
    executionId: "exec-1",
    trigger: "manual",
    calculatedAt: "2026-09-26T10:00:00.000Z",
  },
  reasons: [],
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) => {
    peticiones.push(
      `${request.method} ${new URL(request.url).pathname.replace("/api/v1", "")}`,
    );
  });
});

beforeEach(() => {
  peticiones.length = 0;
  replace.mockReset();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles: ["risk_analyst"],
    hasAnyRole: () => true,
    hasPermission: () => true,
  });
  server.use(
    http.get(`${API_BASE}/customers/900/credit-applications`, () =>
      HttpResponse.json(SOLICITUDES),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("CustomerCreditSection · el crédito en la ficha del cliente", () => {
  it("sin línea calculada (404) lo dice como vacío y deja recalcular con confirmación", async () => {
    server.use(
      http.get(`${API_BASE}/customers/900/credit-line`, () =>
        HttpResponse.json(
          {
            error: { code: "NOT_FOUND", message: "CREDIT_LINE_NOT_CALCULATED" },
            timestamp: "2026-09-26T00:00:00.000Z",
          },
          { status: 404 },
        ),
      ),
      http.post(
        `${API_BASE}/operations/credit/customers/900/credit-line/recalculate`,
        () => HttpResponse.json({ data: LINEA }),
      ),
    );
    renderWithProviders(<CustomerCreditSection customerId="900" />);

    expect(
      await screen.findByText(/todavía no calculó una línea/),
    ).toBeInTheDocument();
    const enlace = await screen.findByRole("link", { name: "Abrir y decidir" });
    expect(enlace).toHaveAttribute(
      "href",
      "/internal/operations/credit/applications/77",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Recalcular línea" }),
    );
    expect(peticiones.some((p) => p.startsWith("POST"))).toBe(false);
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Recalcular",
      }),
    );
    await waitFor(() =>
      expect(peticiones).toContain(
        "POST /operations/credit/customers/900/credit-line/recalculate",
      ),
    );
    expect(
      await screen.findByText(/Línea recalculada: 3\.000,00 BOB/),
    ).toBeInTheDocument();
    expect(screen.getByText("640 · Bueno")).toBeInTheDocument();
  });

  it("si el motor no responde, lo dice y la línea no cambia", async () => {
    server.use(
      http.get(`${API_BASE}/customers/900/credit-line`, () =>
        HttpResponse.json({ data: LINEA }),
      ),
      http.post(
        `${API_BASE}/operations/credit/customers/900/credit-line/recalculate`,
        () =>
          HttpResponse.json(
            {
              error: {
                code: "SERVICE_UNAVAILABLE",
                message: "DECISION_ENGINE_UNAVAILABLE",
              },
              timestamp: "2026-09-26T00:00:00.000Z",
            },
            { status: 503 },
          ),
      ),
    );
    renderWithProviders(<CustomerCreditSection customerId="900" />);
    await screen.findByText("640 · Bueno");
    await userEvent.click(
      screen.getByRole("button", { name: "Recalcular línea" }),
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Recalcular",
      }),
    );
    expect(
      await screen.findByText(
        /La línea vigente no se tocó/,
        {},
        { timeout: 15_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("640 · Bueno")).toBeInTheDocument();
  });

  it("a un rol sin acceso al crédito se le explica, sin pedir nada al servidor", () => {
    mockUseAuth.mockReturnValue({
      permissions: [],
      roles: ["compliance_analyst"],
      hasAnyRole: () => false,
      hasPermission: () => false,
    });
    renderWithProviders(<CustomerCreditSection customerId="900" />);
    expect(screen.getByText(/Tu rol no ve el crédito/)).toBeInTheDocument();
    expect(peticiones).toHaveLength(0);
  });
});

describe("ApplicationFromCasePage · del caso CR a su solicitud", () => {
  it("encuentra la solicitud por su código y reemplaza la URL por la del detalle", async () => {
    renderWithProviders(
      <ApplicationFromCasePage customerId="900" caseCode="CR-CA-2026-000077" />,
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/internal/operations/credit/applications/77",
      ),
    );
  });

  it("si la solicitud no está, lleva a la ficha del cliente", async () => {
    renderWithProviders(
      <ApplicationFromCasePage customerId="900" caseCode="CR-CA-OTRA" />,
    );
    expect(
      await screen.findByText("No encontramos la solicitud CA-OTRA."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Abrir la ficha del cliente/ }),
    ).toHaveAttribute(
      "href",
      "/internal/operations/customers/900/investigation-summary",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("un caso que no es CR no pide nada", () => {
    renderWithProviders(
      <ApplicationFromCasePage customerId="900" caseCode="MR-1" />,
    );
    expect(
      screen.getByText("Este caso no apunta a una solicitud de crédito."),
    ).toBeInTheDocument();
    expect(peticiones).toHaveLength(0);
  });
});
