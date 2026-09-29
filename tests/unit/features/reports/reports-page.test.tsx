import { HttpResponse, http } from "msw";
import { screen } from "@testing-library/react";
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

const { ReportsPage } = await import("@/features/reports/reports-page");
const { ReportsReadinessPage } =
  await import("@/features/reports-readiness/reports-readiness-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: URL[] = [];

async function tarjeta(etiqueta: string): Promise<string> {
  const label = await screen.findByText(etiqueta);
  return label.closest("div.min-w-0")?.textContent ?? "";
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) =>
    peticiones.push(new URL(request.url)),
  );
});

beforeEach(() => {
  peticiones.length = 0;
  mockUseAuth.mockReturnValue({ permissions: ["reporting.read"] });
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/internal/reports`, () =>
      HttpResponse.json({
        data: {
          items: [
            {
              reportId: "risk-overview",
              key: "risk_overview",
              name: "Riesgo",
              description: "d",
              domain: "risk",
              owner: "risk",
              status: "ACTIVE",
              criticality: "HIGH",
              sourceType: "SQL_AGGREGATE",
              sourceReference: "x",
              allowedFilters: {},
              permissions: {},
            },
          ],
          meta: { page: 1, limit: 20, total: 4, totalPages: 1 },
          facets: {
            domains: ["governance", "operations", "risk", "systems"],
            statuses: ["ACTIVE"],
          },
          summary: { total: 4, active: 4, critical: 4 },
        },
      }),
    ),
    http.get(`${API_BASE}/systems/catalog/summary`, () =>
      HttpResponse.json({
        data: {
          generatedAt: "2026-09-29T00:00:00.000Z",
          tables: { total: 200, withPurpose: 150, financialOrRisk: 30 },
          endpoints: { total: 400, withPurpose: 100, testableFromPortal: 300 },
          testSuites: { total: 9, enabled: 7 },
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

describe("Reportería", () => {
  it("las tarjetas salen del resumen del servidor: «Activos» ya no es siempre 0", async () => {
    renderWithProviders(<ReportsPage />);
    expect(await tarjeta("Activos")).toContain("4");
    expect(await tarjeta("Críticos o altos")).toContain("4");
  });

  it("no promete una tabla de informes que no existe", async () => {
    renderWithProviders(<ReportsPage />);
    expect(
      await screen.findByText(/definidos en el código del servidor/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/report_definitions/)).not.toBeInTheDocument();
  });
});

describe("Preparación del release — cobertura del catálogo", () => {
  it("los porcentajes se calculan sobre el catálogo entero del servidor, no sobre 100 filas", async () => {
    renderWithProviders(<ReportsReadinessPage embedded />);
    expect(await tarjeta("Cobertura tablas")).toContain("75%");
    expect(await tarjeta("Cobertura endpoints")).toContain("25%");
    expect(await tarjeta("QA testable")).toContain("75%");
    expect(
      peticiones.some((url) => url.searchParams.get("limit") === "100"),
    ).toBe(false);
  });
});
