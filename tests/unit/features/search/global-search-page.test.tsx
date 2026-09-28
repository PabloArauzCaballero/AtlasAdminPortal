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

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: [],
    roles: [],
    hasAnyRole: () => true,
    hasPermission: () => true,
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("q=cliente"),
}));

const { GlobalSearchPage } =
  await import("@/features/search/global-search-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/internal/search`, () =>
      HttpResponse.json({
        data: {
          items: [
            {
              kind: "quality_rule",
              id: "1",
              title: "Regla",
              description: null,
              href: "/internal/data-quality/rules/1",
            },
          ],
          totals: { endpoints: 0, tables: 0, qualityRules: 1, reports: 2 },
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

describe("GlobalSearchPage", () => {
  it("nombra los cuatro totales, reportes incluidos, y el tipo de cada resultado", async () => {
    renderWithProviders(<GlobalSearchPage />);
    expect(await screen.findByText("Reglas de calidad")).toBeInTheDocument();
    expect(screen.getByText("Reportes")).toBeInTheDocument();
    expect(screen.getByText("Regla de calidad")).toBeInTheDocument();
    expect(screen.queryByText("qualityRules")).toBeNull();
    expect(screen.queryByText("quality_rule")).toBeNull();
  });

  it("no promete buscar clientes", async () => {
    renderWithProviders(<GlobalSearchPage />);
    expect(
      await screen.findByText(/No busca clientes ni préstamos/),
    ).toBeInTheDocument();
  });
});
