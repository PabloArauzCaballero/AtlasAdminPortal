import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
const { elegirOpcion } = await import("../../shared/option-select-helpers");
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

  const consulta = (ruta: string) =>
    peticiones.filter((u) => u.pathname.endsWith(ruta)).at(-1);

  it("el buscador de identidades viaja como q, no como el correo exacto", async () => {
    renderWithProviders(<MerchantUsersPage />);
    await screen.findByText("Ana Comercio");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /Buscar por correo, nombre o código/,
      }),
      { target: { value: "comer" } },
    );
    await waitFor(() =>
      expect(consulta("/merchant/users")?.searchParams.get("q")).toBe("comer"),
    );
    expect(consulta("/merchant/users")?.searchParams.get("email")).toBeNull();
  });

  it("la cola de peticiones nace en «pendientes» y su buscador viaja como q", async () => {
    renderWithProviders(<MerchantUsersPage />);
    await screen.findByText("Ana Comercio");
    await waitFor(() =>
      expect(
        consulta("/merchant/users/provisioning-requests")?.searchParams.get(
          "status",
        ),
      ).toBe("pending"),
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /correo, nombre, cuenta o sucursal/i,
      }),
      { target: { value: "sucre" } },
    );
    await waitFor(() =>
      expect(
        consulta("/merchant/users/provisioning-requests")?.searchParams.get(
          "q",
        ),
      ).toBe("sucre"),
    );
  });

  it("suspender exige un motivo de 8 caracteres y el motivo viaja en el PATCH", async () => {
    let cuerpo: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${API_BASE}/merchant/users/5/status`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { ...USUARIO, status: "suspended" } });
      }),
    );
    renderWithProviders(<MerchantUsersPage />);
    const fila = (await screen.findByText("Ana Comercio")).closest("tr")!;
    await elegirOpcion(
      within(fila).getByLabelText(/Cambiar estado de Ana Comercio/),
      "suspended",
    );
    const confirmar = await screen.findByRole("button", { name: "Cambiar" });
    expect(confirmar).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^Motivo/), "corto");
    expect(confirmar).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText(/^Motivo/),
      " y ya es suficiente",
    );
    await userEvent.click(confirmar);
    await waitFor(() =>
      expect(cuerpo).toEqual({
        status: "suspended",
        reason: "corto y ya es suficiente",
      }),
    );
  });
});
