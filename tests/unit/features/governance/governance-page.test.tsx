import { HttpResponse, http } from "msw";
import { fireEvent, screen } from "@testing-library/react";
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
  usePathname: () => "/internal/governance",
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), prefetch: vi.fn() }),
}));
const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { GovernanceOverviewPage } =
  await import("@/features/governance/governance-overview-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/** Cada petición que sale, con su ruta y su query. */
const peticiones: URL[] = [];
const rutas = () =>
  peticiones.map((url) => url.pathname.replace("/api/v1", ""));

const SUMMARY = {
  generatedAt: "2026-09-29T00:00:00.000Z",
  tables: {
    total: 186,
    withPurpose: 150,
    pii: 41,
    financial: 22,
    risk: 17,
    financialOrRisk: 30,
    legal: 5,
    deviceOrLocation: 6,
    auditCritical: 9,
    personalData: 48,
    pendingReview: 12,
  },
  endpoints: {
    total: 432,
    withPurpose: 400,
    testableFromPortal: 300,
    pii: 60,
    personalData: 64,
    destructive: 18,
    highOrCritical: 33,
    pendingReview: 8,
  },
  testSuites: { total: 9, enabled: 7 },
};

const pagina = (items: unknown[], total: number) => ({
  data: {
    items,
    meta: { page: 1, limit: 20, total, totalPages: Math.ceil(total / 20) },
  },
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) =>
    peticiones.push(new URL(request.url)),
  );
});

beforeEach(() => {
  peticiones.length = 0;
  nav.params = new URLSearchParams();
  nav.replace.mockClear();
  mockUseAuth.mockReturnValue({ permissions: ["governance.data.read"] });
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/systems/catalog/summary`, () =>
      HttpResponse.json({ data: SUMMARY }),
    ),
    http.get(`${API_BASE}/systems/data-entities`, () =>
      HttpResponse.json(
        pagina(
          [
            {
              entityId: "1",
              schemaName: "customer",
              tableName: "customers",
              module: "customers",
              containsPii: true,
              status: "ACTIVE",
            },
          ],
          48,
        ),
      ),
    ),
    http.get(`${API_BASE}/systems/endpoints`, () =>
      HttpResponse.json(pagina([], 0)),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("Gobierno de datos — Resumen", () => {
  it("sin el permiso no dispara ninguna petición y enseña el acceso restringido", async () => {
    mockUseAuth.mockReturnValue({ permissions: [] });
    renderWithProviders(<GovernanceOverviewPage />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(peticiones).toEqual([]);
    expect(
      screen.getByRole("heading", { name: "Acceso restringido" }),
    ).toBeInTheDocument();
  });

  it("las cifras salen del resumen del servidor: no se baja el catálogo al navegador", async () => {
    renderWithProviders(<GovernanceOverviewPage />);
    expect(
      await screen.findByText(
        "Contado sobre 186 tablas y 432 rutas del catálogo.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("41")).toBeInTheDocument();
    // Pendientes = tablas + rutas pendientes, ambas del servidor.
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(rutas()).toEqual(["/systems/catalog/summary"]);
  });

  it("si el resumen falla se ve el error con reintentar", async () => {
    server.use(
      http.get(`${API_BASE}/systems/catalog/summary`, () =>
        HttpResponse.json(
          { error: { code: "BOOM", message: "falló" } },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<GovernanceOverviewPage />);
    expect(
      await screen.findByRole(
        "button",
        { name: /reintentar/i },
        { timeout: 8000 },
      ),
    ).toBeInTheDocument();
  });
});

describe("Gobierno de datos — pestaña Datos personales", () => {
  it("pide al servidor sólo lo personal, con el buscador y la página, en vez del catálogo entero", async () => {
    nav.params = new URLSearchParams("tab=datos-personales&q=cliente");
    renderWithProviders(<GovernanceOverviewPage />);
    expect(
      await screen.findByText("Tablas con datos personales (48)"),
    ).toBeInTheDocument();
    const tablas = peticiones.find((url) =>
      url.pathname.endsWith("/systems/data-entities"),
    );
    expect(Object.fromEntries(tablas!.searchParams)).toMatchObject({
      personalData: "true",
      q: "cliente",
      page: "1",
      limit: "20",
    });
    const rutasPedidas = peticiones.find((url) =>
      url.pathname.endsWith("/systems/endpoints"),
    );
    expect(rutasPedidas!.searchParams.get("personalData")).toBe("true");
    expect(
      await screen.findByText(
        "No hay rutas con datos personales para esta búsqueda.",
      ),
    ).toBeInTheDocument();
    expect(rutas()).not.toContain("/systems/catalog/summary");
  });

  it("cambiar de pestaña escribe la pestaña en la URL", async () => {
    renderWithProviders(<GovernanceOverviewPage />);
    fireEvent.click(
      await screen.findByRole("tab", { name: "Datos personales" }),
    );
    expect(nav.replace).toHaveBeenCalledWith(
      "/internal/governance?tab=datos-personales",
      { scroll: false },
    );
  });
});
