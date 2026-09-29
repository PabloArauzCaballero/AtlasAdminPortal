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
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: URL[] = [];

const TERMINOS = {
  items: [
    {
      termId: "table:10",
      key: "loans",
      name: "Préstamos",
      definition: "Los créditos desembolsados",
      type: "table",
      domain: "CREDIT",
      owner: "riesgo",
      status: "ACTIVE",
      relatedTables: ["loans"],
      relatedColumns: [],
      relatedEndpoints: [],
    },
  ],
  meta: { page: 1, limit: 20, total: 612, totalPages: 31 },
};

const FACETS = {
  domains: [
    { value: "CREDIT", total: 40 },
    { value: "PLATAFORMA", total: 300 },
  ],
  types: [
    { value: "domain", total: 19 },
    { value: "table", total: 186 },
    { value: "field", total: 407 },
  ],
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) =>
    peticiones.push(new URL(request.url)),
  );
});

beforeEach(() => {
  peticiones.length = 0;
  nav.params = new URLSearchParams("tab=terminos");
  mockUseAuth.mockReturnValue({ permissions: ["businessMetadata.read"] });
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/internal/business-metadata/glossary/facets`, () =>
      HttpResponse.json({ data: FACETS }),
    ),
    http.get(`${API_BASE}/internal/business-metadata/glossary`, () =>
      HttpResponse.json({ data: TERMINOS }),
    ),
    http.get(`${API_BASE}/systems/domains/overview`, () =>
      HttpResponse.json({
        data: {
          generatedAt: "2026-09-29T00:00:00.000Z",
          domainSource: "catalog",
          items: [],
          unassigned: { tables: 0, endpoints: 0, modules: [] },
          totals: { tables: 0, endpoints: 0, testSuites: 0 },
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

async function tarjeta(etiqueta: string): Promise<string> {
  const label = await screen.findByText(etiqueta);
  return label.closest("div.min-w-0")?.textContent ?? "";
}

describe("Dominios y glosario — pestaña Términos", () => {
  it("el dominio y el tipo de la URL viajan al servidor con la página", async () => {
    nav.params = new URLSearchParams("tab=terminos&domain=CREDIT&type=table");
    renderWithProviders(<BusinessDomainsPage />);
    expect(await screen.findByText("Préstamos")).toBeInTheDocument();
    const lista = peticiones.find((url) =>
      url.pathname.endsWith("/business-metadata/glossary"),
    );
    expect(Object.fromEntries(lista!.searchParams)).toMatchObject({
      domain: "CREDIT",
      type: "table",
      page: "1",
      limit: "20",
    });
  });

  it("las cifras salen del total y del reparto del servidor, no de la página", async () => {
    renderWithProviders(<BusinessDomainsPage />);
    expect(await tarjeta("Términos que cumplen el filtro")).toContain("612");
    expect(await tarjeta("Campos en el glosario")).toContain("407");
    expect(await tarjeta("Dominios con términos")).toContain("2");
  });

  it("la columna Tipo dice qué es cada término", async () => {
    renderWithProviders(<BusinessDomainsPage />);
    const fila = (await screen.findByText("Préstamos")).closest("tr")!;
    expect(fila.textContent).toContain("Tabla");
  });

  it("en la pestaña Dominios no se pide el glosario", async () => {
    nav.params = new URLSearchParams("tab=dominios");
    renderWithProviders(<BusinessDomainsPage />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(peticiones.some((url) => url.pathname.includes("/glossary"))).toBe(
      false,
    );
  });
});
