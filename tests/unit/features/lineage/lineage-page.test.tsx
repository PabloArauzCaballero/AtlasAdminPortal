import { HttpResponse, http } from "msw";
import { fireEvent, screen, within } from "@testing-library/react";
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
  usePathname: () => "/internal/lineage",
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), prefetch: vi.fn() }),
}));
const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { LineagePage } = await import("@/features/lineage/lineage-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: URL[] = [];

/** El valor de una tarjeta de cifra, buscado por su etiqueta. */
async function tarjeta(etiqueta: string): Promise<string> {
  const label = await screen.findByText(etiqueta);
  return label.closest("div.min-w-0")?.textContent ?? "";
}
const pedidas = (ruta: string) =>
  peticiones.filter((url) => url.pathname === `/api/v1${ruta}`);

const OVERVIEW = {
  generatedAt: "2026-09-29T00:00:00.000Z",
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
  ],
  unassigned: {
    tables: 4,
    endpoints: 11,
    modules: [{ module: "misc", tables: 4 }],
  },
  totals: { tables: 186, endpoints: 432, testSuites: 9 },
};

const nodo = (id: string, label: string, nodeType: string) => ({
  nodeId: id,
  nodeType,
  label,
  domain: "credit",
  status: "ACTIVE",
  criticality: "HIGH",
  referenceId: id.split(":")[1],
  metadata: {},
});

const IMPACT = {
  items: [
    {
      impactId: "impact:1",
      family: "impact",
      sourceNodeId: "endpoint:10",
      targetNodeId: "table:1",
      impactType: "UPDATE",
      severity: "CRITICAL",
      description: "escribe el saldo",
      path: [
        nodo("endpoint:10", "POST /loans", "endpoint"),
        nodo("table:1", "Préstamos", "table"),
      ],
    },
    {
      impactId: "relationship:7",
      family: "relationship",
      sourceNodeId: "table:2",
      targetNodeId: "table:1",
      impactType: "FOREIGN_KEY",
      severity: null,
      description: "el pago es de un préstamo",
      path: [
        nodo("table:2", "Pagos", "table"),
        nodo("table:1", "Préstamos", "table"),
      ],
    },
  ],
  meta: { page: 1, limit: 20, total: 45, totalPages: 3 },
  summary: {
    bySeverity: { LOW: 10, MEDIUM: 5, HIGH: 7, CRITICAL: 3 },
    byFamily: { impact: 25, relationship: 20 },
  },
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
  mockUseAuth.mockReturnValue({ permissions: ["lineage.read"] });
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/systems/domains/overview`, () =>
      HttpResponse.json({ data: OVERVIEW }),
    ),
    http.get(`${API_BASE}/internal/lineage/impact`, () =>
      HttpResponse.json({ data: IMPACT }),
    ),
    http.get(`${API_BASE}/internal/lineage`, () =>
      HttpResponse.json({
        data: {
          nodes: [nodo("table:1", "Préstamos", "table")],
          edges: [],
          generatedAt: "2026-09-29T00:00:00.000Z",
          summary: {
            tables: { shown: 1, total: 186 },
            endpoints: { shown: 0, total: 0 },
            impactEdges: { shown: 0, total: 171 },
            relationshipEdges: { shown: 0, total: 20 },
            truncated: true,
          },
        },
      }),
    ),
    http.get(`${API_BASE}/systems/data-entities`, () =>
      HttpResponse.json(
        pagina(
          [
            {
              entityId: "1",
              schemaName: "credit",
              tableName: "loans",
              module: "credit",
            },
          ],
          186,
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

describe("Lineage — una pantalla, cuatro pestañas", () => {
  it("sin `lineage.read` no pide nada", async () => {
    mockUseAuth.mockReturnValue({ permissions: [] });
    renderWithProviders(<LineagePage />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(peticiones).toEqual([]);
  });

  it("por defecto enseña el grafo y dice que está recortado respecto de lo que cumple el filtro", async () => {
    renderWithProviders(<LineagePage />);
    expect(screen.getByRole("tab", { name: "Grafo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      await screen.findByText(
        /Se muestran 1 de 186 tablas que cumplen el filtro/,
      ),
    ).toBeInTheDocument();
    expect(pedidas("/internal/lineage")).toHaveLength(1);
  });

  it("el filtro de módulo y el tipo de nodo viajan al servidor", async () => {
    nav.params = new URLSearchParams(
      "vista=grafo&domain=credit&nodeType=table",
    );
    renderWithProviders(<LineagePage />);
    await screen.findByText(/Se muestran/);
    const [grafo] = pedidas("/internal/lineage");
    expect(grafo.searchParams.get("domain")).toBe("credit");
    expect(grafo.searchParams.get("nodeType")).toBe("table");
  });
});

describe("Lineage — Relaciones e impacto", () => {
  it("severidad y familia viajan al servidor, y las tarjetas salen de su resumen", async () => {
    nav.params = new URLSearchParams(
      "vista=impacto&severity=CRITICAL&family=impact",
    );
    renderWithProviders(<LineagePage />);
    expect(await tarjeta("Aristas")).toContain("45");
    const [lista] = pedidas("/internal/lineage/impact");
    expect(Object.fromEntries(lista.searchParams)).toMatchObject({
      severity: "CRITICAL",
      family: "impact",
      page: "1",
      limit: "20",
    });
    // Críticas o altas = 3 + 7 del resumen del servidor, no de la página.
    expect(await tarjeta("Críticas o altas")).toContain("10");
  });

  it("una relación entre tablas dice «No aplica» en severidad, no su texto libre", async () => {
    nav.params = new URLSearchParams("vista=impacto");
    renderWithProviders(<LineagePage />);
    const fila = (await screen.findByText("Pagos")).closest("tr")!;
    expect(within(fila).getByText("No aplica")).toBeInTheDocument();
    expect(
      within(fila).getByText("el pago es de un préstamo"),
    ).toBeInTheDocument();
  });

  it("pasar de página pide la siguiente al servidor", async () => {
    nav.params = new URLSearchParams("vista=impacto");
    renderWithProviders(<LineagePage />);
    await screen.findByText("Pagos");
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await vi.waitFor(() =>
      expect(
        pedidas("/internal/lineage/impact").some(
          (url) => url.searchParams.get("page") === "2",
        ),
      ).toBe(true),
    );
  });
});

describe("Lineage — Nodos y Mapa", () => {
  it("«Nodos» pagina tablas y rutas en el servidor, sin el corte de 100", async () => {
    nav.params = new URLSearchParams("vista=nodos");
    renderWithProviders(<LineagePage />);
    expect(await screen.findByText("Tablas (186)")).toBeInTheDocument();
    for (const ruta of ["/systems/data-entities", "/systems/endpoints"]) {
      const [peticion] = pedidas(ruta);
      expect(peticion.searchParams.get("limit")).toBe("20");
      expect(peticion.searchParams.get("page")).toBe("1");
    }
  });

  it("«Mapa por dominio» sale del mapa del servidor y no de listados de 100 filas", async () => {
    nav.params = new URLSearchParams("vista=mapa");
    renderWithProviders(<LineagePage />);
    expect(await screen.findByText("Riesgo de crédito")).toBeInTheDocument();
    expect(await tarjeta("Rutas")).toContain("432");
    expect(pedidas("/systems/endpoints")).toHaveLength(0);
    expect(pedidas("/systems/data-entities")).toHaveLength(0);
  });
});
