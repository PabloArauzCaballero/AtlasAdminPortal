import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { renderWithProviders } from "../../../../helpers/render-with-providers";
import {
  buildDemoTimeline,
  buildPath,
  TOTAL_SECONDS,
} from "@/features/qa-lab/guide/guide-stress-timeline";

// La guía va detrás de un PermissionGate y usa next/link. Aquí se verifica el
// contenido y la interactividad, no el gate ni la navegación (probados aparte),
// así que se reemplazan por passthrough para aislar lo que sí toca esta feature.
vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ permissions: ["systems.endpoints.read"], roles: [] }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=guia"),
  usePathname: () => "/internal/qa/aprender",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// La guía vive ahora como pestaña «Guía de referencia» de Aprender QA Lab
// (`/internal/qa/aprender?tab=guia`); se prueba montada en su página.
const { LearningCenterPage } =
  await import("@/features/qa-tutorials/learning-center-page");
const QaLabGuidePage = () => <LearningCenterPage />;
const { ScenarioTable, TargetsTable, DialsTable } =
  await import("@/features/qa-lab/guide/guide-tables");
const { GuideStressChart } =
  await import("@/features/qa-lab/guide/guide-stress-chart");
const { GuideJourneyDiagram } =
  await import("@/features/qa-lab/guide/guide-journey-diagram");

// jsdom no trae IntersectionObserver (lo usa el índice con scroll-spy) ni una
// implementación útil de matchMedia (la usa el gráfico para respetar
// prefers-reduced-motion). Se stubean para que el árbol monte sin reventar.
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

beforeAll(() => {
  (
    globalThis as unknown as { IntersectionObserver: typeof IOStub }
  ).IntersectionObserver = IOStub;
});

beforeEach(() => {
  setReducedMotion(false);
});

describe("QaLabGuidePage · estructura completa", () => {
  it("renderiza el encabezado y el acceso al lab", () => {
    renderWithProviders(<QaLabGuidePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Aprender QA Lab",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guía de referencia" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir el lab" })).toHaveAttribute(
      "href",
      "/internal/qa/lab",
    );
  });

  it("pinta las ocho secciones del recorrido", () => {
    renderWithProviders(<QaLabGuidePage />);

    for (const title of [
      "Un laboratorio, tres formas de probar",
      "Target, permisos y el reflejo del dry-run",
      "Los headers los gestiona el lab por ti",
      "¿El endpoint responde lo que promete?",
      "¿Aguanta la carga — y a qué precio en latencia?",
      "Encadenar endpoints: la salida de uno alimenta al siguiente",
      "Por qué es difícil hacerte daño con esto",
      "Dónde quedan las corridas",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: title }),
      ).toBeInTheDocument();
    }
  });

  it("el índice lateral lista las secciones numeradas", () => {
    renderWithProviders(<QaLabGuidePage />);

    const nav = screen.getByRole("navigation", { name: "Índice de la guía" });
    expect(within(nav).getByRole("link", { name: /Panorama/ })).toHaveAttribute(
      "href",
      "#panorama",
    );
    expect(
      within(nav).getByRole("link", { name: /Journey encadenado/ }),
    ).toHaveAttribute("href", "#journey");
  });

  it("documenta los tres targets y sus reglas", () => {
    renderWithProviders(<QaLabGuidePage />);

    // "LOCAL"/"STAGING" también aparecen como <code> en otras secciones, así
    // que se acota a la tabla de targets (la primera de la página).
    const targetsTable = screen.getAllByRole("table")[0];
    expect(within(targetsTable).getByText("LOCAL")).toBeInTheDocument();
    expect(within(targetsTable).getByText("STAGING")).toBeInTheDocument();
    expect(
      within(targetsTable).getByText("PRODUCTION_READONLY"),
    ).toBeInTheDocument();
    expect(screen.getByText(/techo duro es de/)).toBeInTheDocument();
  });
});

describe("ScenarioTable · matriz de escenarios y cabeceras como tabla", () => {
  it("tiene cabeceras de columna y una fila por escenario", () => {
    renderWithProviders(<ScenarioTable />);

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Escenario",
      "Qué cambia",
      "Authorization",
      "x-tenant-id",
      "x-idempotency-key",
      "Resultado esperado",
    ]);
    // 1 fila de cabecera + los 8 escenarios del lab.
    expect(within(table).getAllByRole("row")).toHaveLength(9);
    expect(
      screen.getByText(/Respuesta correcta según lo que declara el catálogo\./),
    ).toBeInTheDocument();
  });

  it("«Sin identificarse» enseña su resultado y el header omitido, sin hacer clic", () => {
    renderWithProviders(<ScenarioTable />);

    const row = screen
      .getByText(/Sin identificarse/)
      .closest("tr") as HTMLElement;
    expect(
      within(row).getByText(/401 si la operación exige sesión\./),
    ).toBeInTheDocument();
    expect(within(row).getByText("ninguno")).toBeInTheDocument();
  });

  it("el escenario personalizado avisa que todo es manual", () => {
    renderWithProviders(<ScenarioTable />);

    const row = screen.getByText(/Personalizado/).closest("tr") as HTMLElement;
    expect(within(row).getAllByText("a mano")).toHaveLength(3);
  });
});

describe("TargetsTable y DialsTable · referencia de la guía", () => {
  it("los ambientes son una tabla con sus cabeceras", () => {
    renderWithProviders(<TargetsTable />);
    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Ambiente", "Qué permite", "Base URL"]);
    expect(within(table).getAllByRole("row")).toHaveLength(5);
  });

  it("los diales de carga son una tabla con su rango", () => {
    renderWithProviders(<DialsTable />);
    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Dial", "Qué controla", "Rango"]);
    expect(within(table).getByText("1 – 10.000")).toBeInTheDocument();
  });
});

describe("GuideStressChart · simulación del avance", () => {
  it("arranca en el segundo cero sin requests", () => {
    renderWithProviders(<GuideStressChart />);

    expect(screen.getByText(`0 / ${TOTAL_SECONDS}`)).toBeInTheDocument();
  });

  it("simular la corrida avanza hasta el final con requests medidas", async () => {
    // Con reduced-motion la corrida salta al final de forma síncrona: es la
    // forma determinista de comprobar que el pipeline de datos llena la
    // lectura de totales (el "avance" que pidió el usuario).
    setReducedMotion(true);
    renderWithProviders(<GuideStressChart />);

    await userEvent.click(
      screen.getByRole("button", { name: /Simular corrida/ }),
    );

    expect(
      screen.getByText(`${TOTAL_SECONDS} / ${TOTAL_SECONDS}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Repetir corrida/ }),
    ).toBeInTheDocument();

    // La celda de Requests ya no es cero.
    const requests = screen.getByText("Requests").parentElement;
    expect(requests?.textContent).toMatch(/[1-9]/);
  });

  it("reiniciar vuelve la corrida al segundo cero", async () => {
    setReducedMotion(true);
    renderWithProviders(<GuideStressChart />);
    await userEvent.click(
      screen.getByRole("button", { name: /Simular corrida/ }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(screen.getByText(`0 / ${TOTAL_SECONDS}`)).toBeInTheDocument();
  });
});

describe("GuideJourneyDiagram · encadenamiento y copia", () => {
  it("muestra la variable encadenada y el snippet de pasos", () => {
    renderWithProviders(<GuideJourneyDiagram />);

    expect(screen.getByText("{{customerId}}")).toBeInTheDocument();
    expect(
      screen.getByText(/"customerId": "data\.customerId"/),
    ).toBeInTheDocument();
  });

  it("copiar el journey escribe el array en el portapapeles", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderWithProviders(<GuideJourneyDiagram />);

    await userEvent.click(screen.getByRole("button", { name: /Copiar/ }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain(
      '"customerId": "data.customerId"',
    );
    expect(await screen.findByText(/Copiado/)).toBeInTheDocument();
  });
});

describe("guide-stress-timeline · datos deterministas", () => {
  it("cubre un punto por segundo del rango completo", () => {
    const timeline = buildDemoTimeline();

    expect(timeline).toHaveLength(TOTAL_SECONDS + 1);
    expect(timeline[0].second).toBe(0);
    expect(timeline[TOTAL_SECONDS].second).toBe(TOTAL_SECONDS);
  });

  it("el p95 nunca queda por debajo del promedio y los errores aparecen al saturar", () => {
    const timeline = buildDemoTimeline();

    for (const point of timeline) {
      expect(point.p95LatencyMs).toBeGreaterThanOrEqual(point.avgLatencyMs);
    }
    expect(timeline[10].errorCount).toBe(0);
    expect(timeline[TOTAL_SECONDS].errorCount).toBeGreaterThan(0);
  });

  it("buildPath produce un trazo SVG que arranca con un moveto", () => {
    const timeline = buildDemoTimeline();

    const path = buildPath(timeline, TOTAL_SECONDS, 500, "p95LatencyMs");

    expect(path.startsWith("M ")).toBe(true);
    expect(path).toContain("L ");
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
