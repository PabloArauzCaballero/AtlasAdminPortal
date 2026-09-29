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

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { GovernedViewsPage } =
  await import("@/features/governed-views/governed-views-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: URL[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) =>
    peticiones.push(new URL(request.url)),
  );
});

beforeEach(() => {
  peticiones.length = 0;
  mockUseAuth.mockReturnValue({ permissions: [], hasAnyRole: () => true });
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/internal/views/:view/facets`, ({ params }) =>
      HttpResponse.json({
        data: { view: params.view, facets: { healthStatus: ["DOWN", "UP"] } },
      }),
    ),
    http.get(`${API_BASE}/internal/views/:view`, () =>
      HttpResponse.json({
        data: {
          items: [{ providerCode: "SEGIP", healthStatus: "UP" }],
          meta: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            selectedFields: ["providerCode", "healthStatus"],
          },
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

describe("Vistas del negocio", () => {
  it("todas las vistas buscan, no sólo «Clientes», y el texto dice por qué columnas", async () => {
    renderWithProviders(<GovernedViewsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Salud de proveedores" }),
    );
    const buscador = await screen.findByPlaceholderText(
      "Buscar por código, nombre o error del proveedor…",
    );
    fireEvent.change(buscador, { target: { value: "segip" } });
    await vi.waitFor(() =>
      expect(
        peticiones.some(
          (url) =>
            url.pathname.endsWith("/internal/views/provider-health") &&
            url.searchParams.get("q") === "segip",
        ),
      ).toBe(true),
    );
  });

  it("los valores de los filtros se piden al servidor para la vista activa", async () => {
    renderWithProviders(<GovernedViewsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Salud de proveedores" }),
    );
    await vi.waitFor(() =>
      expect(
        peticiones.some((url) =>
          url.pathname.endsWith("/internal/views/provider-health/facets"),
        ),
      ).toBe(true),
    );
  });
});
