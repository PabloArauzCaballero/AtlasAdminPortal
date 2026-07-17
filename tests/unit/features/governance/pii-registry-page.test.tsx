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

const { PiiRegistryPage } =
  await import("@/features/governance/pii-registry-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/** Cuenta cada petición que sale a la red, sea al endpoint que sea. */
const peticiones: string[] = [];

function conPermisos(permissions: string[]) {
  mockUseAuth.mockReturnValue({ permissions });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) => {
    peticiones.push(new URL(request.url).pathname);
  });
});

beforeEach(() => {
  peticiones.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/*`, () =>
      HttpResponse.json({ data: { items: [], pagination: {} } }),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("PiiRegistryPage — autorización antes de la query (FASE 6)", () => {
  it("sin el permiso no dispara NINGUNA petición", async () => {
    conPermisos([]);

    renderWithProviders(<PiiRegistryPage />);
    // Margen para que cualquier query mal ubicada alcance a salir.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(peticiones).toEqual([]);
  });

  it("sin el permiso muestra el estado de acceso restringido", () => {
    conPermisos([]);

    renderWithProviders(<PiiRegistryPage />);

    expect(
      screen.getByRole("heading", { name: "Acceso restringido" }),
    ).toBeInTheDocument();
  });

  it("sin el permiso no filtra datos PII en el DOM", () => {
    conPermisos([]);

    renderWithProviders(<PiiRegistryPage />);

    expect(screen.queryByText("PII registry")).not.toBeInTheDocument();
    expect(screen.queryByText("Tablas sensibles")).not.toBeInTheDocument();
  });

  it("con otro permiso distinto tampoco dispara peticiones", async () => {
    conPermisos(["systems.read", "audit.read"]);

    renderWithProviders(<PiiRegistryPage />);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(peticiones).toEqual([]);
  });

  it("con el permiso sí carga los datos", async () => {
    conPermisos(["governance.data.read"]);

    renderWithProviders(<PiiRegistryPage />);
    await vi.waitFor(() => expect(peticiones.length).toBeGreaterThan(0));

    expect(screen.getByText("PII registry")).toBeInTheDocument();
  });
});
