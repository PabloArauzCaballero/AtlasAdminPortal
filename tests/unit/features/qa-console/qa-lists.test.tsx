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
    permissions: ["systems.qa.read"],
    roles: [],
    hasAnyRole: () => true,
    hasPermission: () => true,
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/internal/qa",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/qa-tutorials/tutorial-launch-button", () => ({
  TutorialLaunchButton: () => null,
}));
vi.mock("@/features/qa-tutorials/tutorial-provider", () => ({
  useTutorial: () => ({ start: vi.fn(), startPath: vi.fn() }),
}));

const { TestRunsPage } = await import("@/features/qa-console/test-runs-page");
const { TestSuitesPage } =
  await import("@/features/qa-console/test-suites-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

let requests: URL[] = [];
const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  requests = [];
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/systems/test-runs`, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        data: {
          items: [
            {
              runId: "7",
              suiteId: "3",
              environment: "STAGING",
              status: "PASSED",
            },
          ],
          meta,
        },
      });
    }),
    http.get(`${API_BASE}/systems/test-suites`, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        data: {
          items: [
            {
              suiteId: "3",
              code: "LOGIN",
              name: "Inicio de sesión",
              module: "auth",
              suiteType: "SMOKE",
              environmentScope: ["LOCAL"],
              isEnabled: true,
            },
          ],
          meta,
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

const last = (path: string) =>
  requests.filter((url) => url.pathname.endsWith(path)).at(-1)!;

describe("Runs QA", () => {
  it("el buscador ya no está muerto: `q` viaja al servidor", async () => {
    renderWithProviders(<TestRunsPage />);
    await screen.findByText("#7");
    fireEvent.change(
      screen.getByLabelText("Buscar por suite o n.º de corrida…"),
      {
        target: { value: "login" },
      },
    );
    await waitFor(() =>
      expect(last("/test-runs").searchParams.get("q")).toBe("login"),
    );
  });

  it("ofrece Ambiente, que el servidor sí filtra", async () => {
    renderWithProviders(<TestRunsPage />);
    await screen.findByText("#7");
    expect(screen.getByLabelText("Ambiente")).toBeInTheDocument();
    expect(screen.queryByText(/pendiente del servicio interno/)).toBeNull();
  });
});

describe("Suites QA", () => {
  it("el buscador manda `q` (código, nombre o módulo), no un módulo exacto", async () => {
    renderWithProviders(<TestSuitesPage />);
    await screen.findByText("LOGIN");
    fireEvent.change(
      screen.getByLabelText("Buscar por código, nombre o módulo…"),
      {
        target: { value: "sesión" },
      },
    );
    await waitFor(() =>
      expect(last("/test-suites").searchParams.get("q")).toBe("sesión"),
    );
    expect(last("/test-suites").searchParams.get("module")).toBeNull();
  });

  it("con un filtro que no casa, dice que no hay coincidencias en vez de «todavía no hay suites»", async () => {
    server.use(
      http.get(`${API_BASE}/systems/test-suites`, () =>
        HttpResponse.json({ data: { items: [], meta: { ...meta, total: 0 } } }),
      ),
    );
    renderWithProviders(<TestSuitesPage />);
    await screen.findByText("Todavía no hay suites de prueba");
    fireEvent.change(
      screen.getByLabelText("Buscar por código, nombre o módulo…"),
      {
        target: { value: "nada" },
      },
    );
    expect(
      await screen.findByText("Ninguna suite coincide con la búsqueda."),
    ).toBeInTheDocument();
  });
});
