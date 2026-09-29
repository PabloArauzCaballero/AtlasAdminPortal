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
    permissions: ["systems.stress.read", "systems.stress.execute"],
    roles: [],
    hasAnyRole: () => true,
    hasPermission: () => true,
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/internal/qa/stress",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/qa-tutorials/tutorial-launch-button", () => ({
  TutorialLaunchButton: () => null,
}));

const { StressRunsPage } =
  await import("@/features/qa-stress/stress-runs-page");
const { StressProfilesPage } =
  await import("@/features/qa-stress/stress-profiles-page");
const { StressProfileDetailPage } =
  await import("@/features/qa-stress/stress-profile-detail-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

let requests: URL[] = [];
let consumerEnabled = false;
const last = (path: string) =>
  requests.filter((url) => url.pathname.endsWith(path)).at(-1)!;

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  requests = [];
  consumerEnabled = false;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/systems/stress-runs/capabilities`, () =>
      HttpResponse.json({
        data: {
          consumerEnabled,
          disabledReason: consumerEnabled
            ? null
            : "El consumidor de estrés está apagado en este entorno.",
        },
      }),
    ),
    http.get(`${API_BASE}/systems/stress-runs`, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        data: {
          items: [
            {
              jobRunId: "11",
              jobCode: "systems_stress_run",
              status: "completed",
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      });
    }),
    http.get(`${API_BASE}/systems/stress-profiles`, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        data: {
          items: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        },
      });
    }),
    http.get(`${API_BASE}/systems/stress-matrix`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get("page"));
      return HttpResponse.json({
        data: {
          items: [
            {
              endpoint: {
                endpointId: String(page),
                fullPath: `/ruta-pagina-${page}`,
                module: "m",
                requiresStressTest: true,
              },
              profiles: [],
              hasEnabledProfile: false,
            },
          ],
          meta: { page, limit: 10, total: 25, totalPages: 3 },
        },
      });
    }),
    http.get(`${API_BASE}/systems/stress-profiles/5`, () =>
      HttpResponse.json({
        data: {
          profileId: "5",
          endpointId: "9",
          code: "P_LOANS",
          name: "Carga de préstamos",
          status: "ACTIVE",
          isEnabled: true,
          environmentScope: ["LOCAL"],
          targetRps: 5,
          durationSeconds: 30,
          concurrency: 2,
          maxErrorRate: 0.01,
          maxP95Ms: 500,
          requiresApproval: false,
          notes: null,
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

describe("Historial de corridas de estrés", () => {
  it("el buscador manda `q` (código de perfil o n.º), no un suiteId que el servidor rechazaba", async () => {
    renderWithProviders(<StressRunsPage />);
    await screen.findByText("#11");
    fireEvent.change(
      screen.getByLabelText("Buscar por código de perfil o n.º de corrida…"),
      {
        target: { value: "LOANS" },
      },
    );
    await waitFor(() =>
      expect(last("/stress-runs").searchParams.get("q")).toBe("LOANS"),
    );
    expect(last("/stress-runs").searchParams.get("suiteId")).toBeNull();
  });
});

describe("Matriz de cobertura", () => {
  it("«Siguiente» pide la página 2 al servidor", async () => {
    renderWithProviders(<StressProfilesPage />);
    await screen.findByText("/ruta-pagina-1");
    const nextButtons = screen.getAllByRole("button", { name: /Siguiente/ });
    fireEvent.click(nextButtons.at(-1)!);
    expect(await screen.findByText("/ruta-pagina-2")).toBeInTheDocument();
    expect(last("/stress-matrix").searchParams.get("page")).toBe("2");
  });
});

describe("Encolar una corrida", () => {
  it("con el consumidor apagado, el botón se deshabilita y se explica por qué", async () => {
    renderWithProviders(<StressProfileDetailPage profileId="5" />);
    expect(
      await screen.findByText(/Encolar está desactivado en este entorno/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Encolar dry-run/ }),
    ).toBeDisabled();
  });

  it("con el consumidor encendido, se puede encolar", async () => {
    consumerEnabled = true;
    renderWithProviders(<StressProfileDetailPage profileId="5" />);
    const button = await screen.findByRole("button", {
      name: /Encolar dry-run/,
    });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.queryByText(/Encolar está desactivado/)).toBeNull();
  });
});
