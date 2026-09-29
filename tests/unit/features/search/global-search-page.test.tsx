import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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
const replace = vi.fn();
let searchParams = new URLSearchParams("q=cliente&kind=quality_rule");
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  usePathname: () => "/internal/search",
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const { GlobalSearchPage } =
  await import("@/features/search/global-search-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

let requests: URL[] = [];

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  requests = [];
  replace.mockReset();
  searchParams = new URLSearchParams("q=cliente&kind=quality_rule");
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/internal/search`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get("page"));
      return HttpResponse.json({
        data: {
          items: [
            {
              kind: "quality_rule",
              id: `quality:${page}`,
              title: `Regla de la página ${page}`,
              description: null,
              href: "/internal/data-quality/rules/1",
            },
          ],
          totals: { endpoints: 0, tables: 0, qualityRules: 41, reports: 2 },
          meta: { page, limit: 20, total: 41, totalPages: 3 },
        },
      });
    }),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("GlobalSearchPage", () => {
  it("pide UN tipo paginado y enseña los conteos reales del servidor, no las filas de la página", async () => {
    renderWithProviders(<GlobalSearchPage />);
    expect(await screen.findByText("Regla de la página 1")).toBeInTheDocument();
    const last = requests.at(-1)!;
    expect(last.searchParams.get("kind")).toBe("quality_rule");
    expect(last.searchParams.get("limit")).toBe("20");
    // 41 de reglas + 2 reportes: el total no es la fila única que llegó.
    expect(screen.getByText("43")).toBeInTheDocument();
    expect(screen.getByText("Reglas de calidad (41)")).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument();
  });

  it("«Siguiente» pide la página 2 al servidor", async () => {
    renderWithProviders(<GlobalSearchPage />);
    await screen.findByText("Regla de la página 1");
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(await screen.findByText("Regla de la página 2")).toBeInTheDocument();
    expect(requests.at(-1)!.searchParams.get("page")).toBe("2");
  });

  it("cambiar de pestaña escribe el tipo en la URL", async () => {
    renderWithProviders(<GlobalSearchPage />);
    await screen.findByText("Regla de la página 1");
    fireEvent.click(screen.getByRole("button", { name: "Reportes (2)" }));
    expect(replace).toHaveBeenCalledWith(
      "/internal/search?q=cliente&kind=report",
      { scroll: false },
    );
  });

  it("sin pestaña elegida abre la primera que tiene resultados", async () => {
    searchParams = new URLSearchParams("q=cliente");
    renderWithProviders(<GlobalSearchPage />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/internal/search?q=cliente&kind=quality_rule",
        { scroll: false },
      ),
    );
  });

  it("no promete buscar clientes", async () => {
    renderWithProviders(<GlobalSearchPage />);
    expect(
      await screen.findByText(/No busca clientes ni préstamos/),
    ).toBeInTheDocument();
  });

  it("un error se ve con reintentar", async () => {
    server.use(
      http.get(`${API_BASE}/internal/search`, () =>
        HttpResponse.json({ error: { message: "caído" } }, { status: 500 }),
      ),
    );
    renderWithProviders(<GlobalSearchPage />);
    expect(
      await screen.findByRole("button", { name: /Reintentar/i }),
    ).toBeInTheDocument();
  });
});
