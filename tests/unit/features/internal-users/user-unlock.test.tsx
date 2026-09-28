import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
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

const { UserDetailPage } =
  await import("@/features/internal-users/user-detail-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/**
 * Desbloquear una cuenta interna desde su ficha (B14). Antes sólo se podía por SQL, y por SQL con
 * la trampa del hash por ssh. Se fija: el botón sale sólo con el bloqueo VIGENTE y con
 * `internal.users.manage`, el motivo es obligatorio y viaja en el cuerpo, y un 409 se explica.
 */
const LOCKED_UNTIL = "2026-09-26T12:15:00.000Z";
let bloqueada = true;
const cuerpos: unknown[] = [];

function perfil() {
  return {
    data: {
      user: {
        id: "5",
        tenantId: "1",
        email: "ana@atlas.test",
        fullName: "Ana Interna",
        status: "active",
        roles: ["SUPPORT_AGENT"],
        permissions: [],
      },
      lock: bloqueada
        ? { locked: true, lockedUntil: LOCKED_UNTIL, failedLoginAttempts: 0 }
        : { locked: false, lockedUntil: null, failedLoginAttempts: 0 },
    },
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

beforeEach(() => {
  bloqueada = true;
  cuerpos.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  mockUseAuth.mockReturnValue({
    user: { id: "1" },
    permissions: ["internal.users.read", "internal.users.manage"],
    roles: ["admin"],
    hasAnyRole: () => true,
    hasPermission: () => true,
  });
  server.use(
    http.get(`${API_BASE}/internal/users/5`, () => HttpResponse.json(perfil())),
    http.get(`${API_BASE}/internal/roles`, () =>
      HttpResponse.json({ data: { items: [] } }),
    ),
    http.post(`${API_BASE}/internal/users/5/unlock`, async ({ request }) => {
      cuerpos.push(await request.json());
      bloqueada = false;
      return HttpResponse.json(perfil());
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("Desbloquear una cuenta interna", () => {
  it("con el bloqueo vigente, exige motivo, lo manda y la ficha deja de ofrecerlo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserDetailPage internalUserId="5" />);

    const boton = await screen.findByRole("button", { name: "Desbloquear" });
    await user.click(boton);
    expect(
      await screen.findByText("El motivo debe tener al menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);

    await user.type(
      screen.getByPlaceholderText(/Confirmado por teléfono/),
      "Se equivocó de contraseña al volver de vacaciones",
    );
    await user.click(boton);

    await waitFor(() =>
      expect(cuerpos).toEqual([
        { reason: "Se equivocó de contraseña al volver de vacaciones" },
      ]),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Desbloquear" })).toBeNull(),
    );
  });

  it("sin bloqueo vigente no ofrece el botón", async () => {
    bloqueada = false;
    renderWithProviders(<UserDetailPage internalUserId="5" />);
    await screen.findByText("Bloqueo por intentos fallidos");
    expect(screen.queryByRole("button", { name: "Desbloquear" })).toBeNull();
  });

  it("sin internal.users.manage no ofrece el botón aunque esté bloqueada", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      permissions: ["internal.users.read"],
      roles: ["readonly_auditor"],
      hasAnyRole: () => true,
      hasPermission: () => false,
    });
    renderWithProviders(<UserDetailPage internalUserId="5" />);
    await screen.findByText("Bloqueo por intentos fallidos");
    expect(screen.queryByRole("button", { name: "Desbloquear" })).toBeNull();
  });

  it("un 409 se explica: el bloqueo ya no estaba", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE}/internal/users/5/unlock`, () =>
        HttpResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "INTERNAL_USER_NOT_LOCKED",
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<UserDetailPage internalUserId="5" />);
    await user.type(
      await screen.findByPlaceholderText(/Confirmado por teléfono/),
      "Motivo suficientemente largo",
    );
    await user.click(screen.getByRole("button", { name: "Desbloquear" }));
    expect(
      await screen.findByText(/La cuenta ya no estaba bloqueada/),
    ).toBeInTheDocument();
  });
});
