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

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { BusinessDomainsPage } =
  await import("@/features/business-metadata/domains-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: string[] = [];

/** Lo que devuelve `GET /systems/domains/overview`: el mapa YA cruzado en el servidor. */
const OVERVIEW = {
  requestId: "r-1",
  data: {
    generatedAt: "2026-09-08T00:00:00.000Z",
    domainSource: "catalog",
    items: [
      {
        domainCode: "RIESGO_CREDITO",
        domainName: "Riesgo de crédito",
        description: "Decide cuánto prestar.",
        ownerTeam: "riesgo",
        dataNature: "DECISION",
        status: "ACTIVE",
        tables: 18,
        piiTables: 2,
        endpoints: 57,
        criticalEndpoints: 9,
        testSuites: 1,
        pendingReview: 3,
        modules: ["risk", "credit"],
      },
      {
        domainCode: "PLATAFORMA",
        domainName: "Plataforma",
        description: null,
        ownerTeam: null,
        dataNature: null,
        status: null,
        tables: 3,
        piiTables: 0,
        endpoints: 4,
        criticalEndpoints: 0,
        testSuites: 0,
        pendingReview: 0,
        modules: ["platform"],
      },
    ],
    unassigned: {
      tables: 101,
      endpoints: 12,
      modules: [{ module: "operations", tables: 101 }],
    },
    totals: { tables: 186, endpoints: 432, testSuites: 6 },
  },
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) => {
    peticiones.push(new URL(request.url).pathname);
  });
});

beforeEach(() => {
  peticiones.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  mockUseAuth.mockReturnValue({
    permissions: ["businessMetadata.read"],
    roles: ["admin"],
    hasAnyRole: () => true,
    hasPermission: (permission: string) =>
      permission === "businessMetadata.read",
  });
  server.use(
    http.get(`${API_BASE}/systems/domains/overview`, () =>
      HttpResponse.json(OVERVIEW),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("BusinessDomainsPage — el mapa lo calcula el backend", () => {
  it("pinta las cifras del agregado, no las de una página de 100 filas", async () => {
    renderWithProviders(<BusinessDomainsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("domain-RIESGO_CREDITO")).toBeInTheDocument(),
    );
    const card = screen.getByTestId("domain-RIESGO_CREDITO");
    expect(card).toHaveTextContent("Endpoints: 57");
    expect(card).toHaveTextContent("Tablas: 18");
    expect(card).toHaveTextContent("Críticos: 9");
    // Los totales globales salen del backend: 432 endpoints, no 100.
    expect(screen.getByText("432")).toBeInTheDocument();
  });

  it("sólo pide el agregado: ni endpoints, ni tablas, ni suites paginadas", async () => {
    renderWithProviders(<BusinessDomainsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("domain-PLATAFORMA")).toBeInTheDocument(),
    );
    expect(peticiones).toEqual(["/api/v1/systems/domains/overview"]);
  });

  it("enseña lo que falta clasificar, por módulo", async () => {
    renderWithProviders(<BusinessDomainsPage />);
    await waitFor(() =>
      expect(screen.getByText("Tablas sin dominio")).toBeInTheDocument(),
    );
    expect(screen.getByText("operations")).toBeInTheDocument();
  });

  it("sin el permiso no dispara ninguna petición", async () => {
    mockUseAuth.mockReturnValue({
      permissions: [],
      roles: [],
      hasAnyRole: () => false,
      hasPermission: () => false,
    });
    renderWithProviders(<BusinessDomainsPage />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(peticiones).toEqual([]);
  });
});
