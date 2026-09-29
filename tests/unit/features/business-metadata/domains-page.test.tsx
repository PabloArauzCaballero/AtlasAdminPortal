import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
  usePathname: () => "/internal/business-metadata/domains",
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), prefetch: vi.fn() }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { BusinessDomainsPage } =
  await import("@/features/business-metadata/domains-page");
const { elegirOpcion } = await import("../../shared/option-select-helpers");
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
    const fila = screen.getByTestId("domain-RIESGO_CREDITO").closest("tr")!;
    const celdas = within(fila)
      .getAllByRole("cell")
      .map((celda) => celda.textContent);
    // Endpoints, Tablas, Suites, PII, Críticos y En revisión, cada cifra en su columna.
    expect(celdas).toEqual(
      expect.arrayContaining(["57", "18", "1", "2", "9", "3"]),
    );
    const cabeceras = within(fila.closest("table")!)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(celdas[cabeceras.indexOf("Endpoints")]).toBe("57");
    expect(celdas[cabeceras.indexOf("Tablas")]).toBe("18");
    expect(celdas[cabeceras.indexOf("Críticos")]).toBe("9");
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
      expect(
        screen.getByRole("heading", { name: "Tablas sin dominio" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "operations" })).toHaveAttribute(
      "href",
      "/internal/data-catalog/tables?q=operations",
    );
  });

  it("los dominios van en tabla con cabeceras, buscador y filtros que recortan", async () => {
    renderWithProviders(<BusinessDomainsPage />);
    await screen.findByTestId("domain-RIESGO_CREDITO");
    const tabla = screen.getByTestId("domain-RIESGO_CREDITO").closest("table")!;
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((th) => th.textContent)
        .filter(Boolean),
    ).toEqual([
      "Dominio",
      "Revisión",
      "Descripción",
      "Endpoints",
      "Tablas",
      "Suites",
      "PII",
      "Críticos",
      "En revisión",
      "Módulos",
      "Ver",
    ]);
    const buscador = screen.getAllByRole("textbox", {
      name: /Buscar dominio, nombre, descripción o módulo/,
    })[0]!;
    fireEvent.change(buscador, { target: { value: "credit" } });
    await waitFor(() =>
      expect(screen.queryByTestId("domain-PLATAFORMA")).toBeNull(),
    );
    expect(screen.getByTestId("domain-RIESGO_CREDITO")).toBeInTheDocument();
    fireEvent.change(buscador, { target: { value: "no-existe-este-dominio" } });
    expect(
      await screen.findByText("Ningún dominio coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("el filtro de datos personales deja sólo los dominios con PII", async () => {
    renderWithProviders(<BusinessDomainsPage />);
    await screen.findByTestId("domain-RIESGO_CREDITO");
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Datos personales/ }),
      "yes",
    );
    await waitFor(() =>
      expect(screen.queryByTestId("domain-PLATAFORMA")).toBeNull(),
    );
    expect(screen.getByTestId("domain-RIESGO_CREDITO")).toBeInTheDocument();
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
