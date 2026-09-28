import { HttpResponse, http } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
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

const { MerchantUsersPage } =
  await import("@/features/merchant-identity/merchant-users-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/**
 * Identidades de comercio: los contadores de cabecera son TOTALES del tenant (no la página), el
 * estado se lee en español, y cambiarlo sólo se ofrece a quien el backend deja.
 */
const peticiones: URL[] = [];

const USUARIO = {
  id: "5",
  email: "ana@comercio.test",
  fullName: "Ana Comercio",
  status: "active",
  mustChangePassword: false,
  lastLoginAt: null,
};

function sesion(permissions: string[]) {
  mockUseAuth.mockReturnValue({
    permissions,
    roles: ["internal_operator"],
    hasAnyRole: () => true,
    hasPermission: (p: string) => permissions.includes(p),
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) => {
    peticiones.push(new URL(request.url));
  });
});

beforeEach(() => {
  peticiones.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  sesion(["merchant.users.read", "merchant.users.manage"]);
  server.use(
    http.get(`${API_BASE}/merchant/users`, ({ request }) => {
      const status = new URL(request.url).searchParams.get("status");
      const total =
        status === "active"
          ? 40
          : status === "suspended"
            ? 3
            : status === "disabled"
              ? 2
              : 45;
      return HttpResponse.json({
        data: { items: [USUARIO], page: 1, limit: 25, total },
      });
    }),
    http.get(
      `${API_BASE}/merchant/users/provisioning-requests`,
      ({ request }) => {
        const status = new URL(request.url).searchParams.get("status");
        return HttpResponse.json({
          data: { items: [], page: 1, limit: 50, total: status ? 61 : 0 },
        });
      },
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

const valorDe = (etiqueta: string) =>
  screen.getByText(etiqueta).parentElement?.textContent ?? "";

describe("MerchantUsersPage", () => {
  it("los contadores son totales pedidos al servidor, no las filas de la página", async () => {
    renderWithProviders(<MerchantUsersPage />);
    await waitFor(() => expect(valorDe("Activas")).toContain("40"));
    expect(valorDe("Suspendidas o dadas de baja")).toContain("5");
    expect(valorDe("Por atender")).toContain("61");
    expect(
      peticiones.some(
        (u) =>
          u.pathname.endsWith("/provisioning-requests") &&
          u.searchParams.get("status") === "pending",
      ),
    ).toBe(true);
  });

  it("el estado se lee en español", async () => {
    renderWithProviders(<MerchantUsersPage />);
    const fila = (await screen.findByText("Ana Comercio")).closest("tr")!;
    expect(within(fila).getByText("Activa")).toBeInTheDocument();
    expect(within(fila).queryByText("active")).toBeNull();
  });

  it("sin `merchant.users.manage` no ofrece cambiar el estado", async () => {
    sesion(["merchant.users.read"]);
    renderWithProviders(<MerchantUsersPage />);
    const fila = (await screen.findByText("Ana Comercio")).closest("tr")!;
    expect(
      within(fila).queryByLabelText(/Cambiar estado de Ana Comercio/),
    ).toBeNull();
    expect(
      within(fila).getByText("Sin permiso para cambiarlo"),
    ).toBeInTheDocument();
  });
});
