import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
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

const { PortfolioOperationsPage } =
  await import("@/features/portfolio-operations/portfolio-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: string[] = [];

const RESUMEN = {
  data: {
    policy: {
      id: "1",
      policyCode: "ASFI",
      versionCode: "v1",
      scaleCode: "A-F",
      contaminationEnabled: true,
    },
    grades: [
      {
        grade: "A",
        gradeLabel: "Normal",
        severityRank: 1,
        loanCount: 12,
        exposureAmount: "1510330.00",
        provisionAmount: "15103.30",
      },
    ],
    totals: {
      loanCount: 12,
      exposureAmount: "1510330.00",
      provisionAmount: "15103.30",
    },
  },
};

const ESTADO = {
  data: {
    pending: 4,
    retrying: 1,
    exhausted: 2,
    sent: 40,
    oldestPendingObservedAt: "2026-08-01T00:00:00.000Z",
    lastSentAt: "2026-09-07T10:00:00.000Z",
    configured: true,
    maxAttempts: 6,
  },
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
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles: ["risk_analyst"],
    hasAnyRole: () => true,
    hasPermission: () => true,
  });
  server.use(
    http.get(`${API_BASE}/operations/credit-rating/portfolio-summary`, () =>
      HttpResponse.json(RESUMEN),
    ),
    http.get(`${API_BASE}/operations/loans/outcome-status`, () =>
      HttpResponse.json(ESTADO),
    ),
    http.get(`${API_BASE}/operations/loans/outcome-backlog`, () =>
      HttpResponse.json({ data: { items: [] } }),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("PortfolioOperationsPage — calificación de Atlas, desenlaces del Motor", () => {
  it("pinta la calificación y la salud de la entrega, sin botones de runbook de mora ni de entrega", async () => {
    renderWithProviders(<PortfolioOperationsPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Calificación de cartera" }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Esperando entrega").parentElement,
      ).toHaveTextContent("4"),
    );
    expect(screen.getByText("Agotados").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Entregados").parentElement).toHaveTextContent(
      "40",
    );

    // Los dos botones que eran la única forma de que ocurrieran la mora y la entrega ya no están:
    // son jobs. Recalificar sí sigue, porque la calificación es de Atlas.
    expect(
      screen.queryByRole("button", { name: /entregar desenlaces/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /recalcular mora/i }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Recalificar la cartera" }),
    ).toBeInTheDocument();
  });

  it("sólo lee: no dispara ninguna mutación al cargar", async () => {
    renderWithProviders(<PortfolioOperationsPage />);
    await waitFor(() =>
      expect(screen.getByText("Entregados")).toBeInTheDocument(),
    );
    expect(peticiones.every((p) => p.startsWith("GET "))).toBe(true);
    expect(peticiones).toContain("GET /operations/loans/outcome-status");
    expect(peticiones).not.toContain("POST /operations/loans/outcome-dispatch");
  });

  it("avisa cuando falta la credencial del Motor: el job no puede entregar", async () => {
    server.use(
      http.get(`${API_BASE}/operations/loans/outcome-status`, () =>
        HttpResponse.json({ data: { ...ESTADO.data, configured: false } }),
      ),
    );
    renderWithProviders(<PortfolioOperationsPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/no tiene configurada la credencial/),
      ).toBeInTheDocument(),
    );
  });

  it("enlaza a la medida en el Motor sólo si el Motor está configurado", async () => {
    vi.stubEnv("NEXT_PUBLIC_DECISION_ENGINE_URL", "");
    renderWithProviders(<PortfolioOperationsPage />);
    await waitFor(() =>
      expect(screen.getByText("Entregados")).toBeInTheDocument(),
    );
    // `engine-links` lee la variable al cargar el módulo: sin ella, ningún enlace.
    expect(
      screen.queryByRole("link", { name: /medir en el motor/i }),
    ).toBeNull();
  });
});

/** Una sesión con estos roles de token, con `hasAnyRole` de verdad y no un «sí» a todo. */
function sesionCon(roles: string[]) {
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles,
    hasAnyRole: (pedidos: string[]) => pedidos.some((r) => roles.includes(r)),
    hasPermission: () => false,
  });
}

describe("PortfolioOperationsPage — lo que no se puede o falla, se dice", () => {
  it("un error al leer los agotados NO se pinta como «ninguno agotó»", async () => {
    server.use(
      http.get(`${API_BASE}/operations/loans/outcome-backlog`, () =>
        HttpResponse.json(
          { error: { code: "INTERNAL", message: "Se cayó la lectura" } },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<PortfolioOperationsPage />);
    expect(await screen.findByText(/Se cayó la lectura/)).toBeInTheDocument();
    expect(
      screen.queryByText("Ningún desenlace agotó sus reintentos."),
    ).toBeNull();
  });

  it("a quien el backend no deja leer los agotados no se los pide ni le miente", async () => {
    sesionCon(["compliance_analyst"]);
    renderWithProviders(<PortfolioOperationsPage />);
    await waitFor(() =>
      expect(screen.getByText("Entregados")).toBeInTheDocument(),
    );
    expect(peticiones).not.toContain("GET /operations/loans/outcome-backlog");
    expect(
      screen.getByText(/Esta lista sólo la ven Análisis de riesgo/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Ningún desenlace agotó sus reintentos."),
    ).toBeNull();
    // Cumplimiento lee la cartera pero no la recalifica.
    expect(
      screen.queryByRole("button", { name: "Recalificar la cartera" }),
    ).toBeNull();
  });

  it("recalificar la cartera pinta cuántos se calificaron y cuáles fallaron", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE}/operations/credit-rating/sweep`, () =>
        HttpResponse.json({
          data: {
            customers: 5,
            rated: 4,
            failed: 1,
            failedCustomerIds: ["77"],
          },
        }),
      ),
    );
    renderWithProviders(<PortfolioOperationsPage />);
    await user.click(
      await screen.findByRole("button", { name: "Recalificar la cartera" }),
    );
    await user.click(await screen.findByRole("button", { name: "Ejecutar" }));
    expect(
      await screen.findByText(/4 calificados y 1 fallaron \(clientes 77\)/),
    ).toBeInTheDocument();
  });

  it("un crédito que no existe se dice; texto que no es número ni se manda", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE}/operations/credit-rating/loans/:id/rate`, () =>
        HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "LOAN_NOT_FOUND" } },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<PortfolioOperationsPage />);
    const campo = await screen.findByRole("textbox", {
      name: /recalificar un crédito/i,
    });
    await user.type(campo, "L-7");
    expect(screen.getByText(/Escribe sólo cifras/)).toBeInTheDocument();
    const [calificarCredito] = screen.getAllByRole("button", {
      name: "Calificar",
    });
    expect(calificarCredito).toBeDisabled();

    await user.clear(campo);
    await user.type(campo, "999");
    await user.click(calificarCredito!);
    expect(
      await screen.findByText("No existe un crédito con ese número."),
    ).toBeInTheDocument();
  });
});

describe("PortfolioOperationsPage — quién entra", () => {
  it("QA no entra: el backend no le sirve la cartera y el 403 era lo único que veía", () => {
    sesionCon(["qa_engineer"]);
    renderWithProviders(<PortfolioOperationsPage />);
    expect(screen.getByText("Acceso restringido")).toBeInTheDocument();
  });

  it("cumplimiento sí entra a leerla", async () => {
    sesionCon(["compliance_analyst"]);
    renderWithProviders(<PortfolioOperationsPage />);
    expect(
      await screen.findByRole("heading", { name: "Calificación de cartera" }),
    ).toBeInTheDocument();
  });
});
