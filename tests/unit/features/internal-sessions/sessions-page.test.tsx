import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { SessionsPage } from "@/features/internal-sessions/sessions-page";
import { describeUserAgent } from "@/features/internal-sessions/user-agent";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

let permisos = ["internal.sessions.read", "internal.users.manage"];
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "10" },
    permissions: permisos,
    roles: [],
    hasPermission: (permiso: string) => permisos.includes(permiso),
    hasAnyRole: () => true,
  }),
}));

const request = vi.mocked(apiRequest);
let falla: Error | null = null;
let items: unknown[] = [];

const sesion = (over: Record<string, unknown> = {}) => ({
  sessionId: "91",
  internalUserId: "5",
  fullName: "Ana Pérez",
  email: "ana@atlas.test",
  status: "active",
  lastLoginAt: "2026-10-17T08:00:00.000Z",
  renewedAt: "2026-10-17T11:30:00.000Z",
  expiresAt: "2026-10-24T08:00:00.000Z",
  activeNow: true,
  ipAddress: "10.0.0.1",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
  ...over,
});

beforeEach(() => {
  permisos = ["internal.sessions.read", "internal.users.manage"];
  falla = null;
  items = [
    sesion(),
    sesion({
      sessionId: "90",
      internalUserId: "10",
      fullName: "Yo mismo",
      email: "yo@atlas.test",
      activeNow: false,
      ipAddress: "10.0.0.2",
      userAgent: null,
    }),
  ];
  request.mockReset();
  request.mockImplementation(async (path, options) => {
    if (falla) throw falla;
    if (path === "/internal/sessions") {
      return {
        items,
        meta: { page: 1, limit: 25, total: items.length, totalPages: 1 },
        summary: {
          openSessions: items.length,
          people: 2,
          activeWindowMinutes: 60,
        },
      };
    }
    if (String(path).endsWith("/sessions/revoke")) {
      expect(options).toMatchObject({ method: "POST" });
      return { internalUserId: "5", revokedSessions: 2 };
    }
    throw new Error(`ruta inesperada ${String(path)}`);
  });
});

describe("Sesiones activas", () => {
  it("lista quién tiene sesión abierta, con su actividad, dispositivo y el resumen", async () => {
    renderWithProviders(<SessionsPage />);
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(
      screen.getByText("2 sesiones abiertas de 2 personas."),
    ).toBeInTheDocument();
    expect(screen.getByText("Activa ahora")).toBeInTheDocument();
    expect(screen.getByText("Sin actividad reciente")).toBeInTheDocument();
    expect(screen.getByText("Chrome en macOS")).toBeInTheDocument();
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("/internal/sessions", {
      query: { page: 1, limit: 25 },
    });
  });

  it("no ofrece cerrar la sesión propia", async () => {
    renderWithProviders(<SessionsPage />);
    await screen.findByText("Yo mismo");
    expect(screen.getByText("Tu sesión")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /cerrar sesiones/i }),
    ).toHaveLength(1);
  });

  it("sin internal.users.manage se ve la lista pero no el botón", async () => {
    permisos = ["internal.sessions.read"];
    renderWithProviders(<SessionsPage />);
    await screen.findByText("Ana Pérez");
    expect(
      screen.queryByRole("button", { name: /cerrar sesiones/i }),
    ).not.toBeInTheDocument();
  });

  it("cerrar exige motivo de 8 caracteres, lo envía y avisa cuántas se cerraron", async () => {
    renderWithProviders(<SessionsPage />);
    await screen.findByText("Ana Pérez");
    await userEvent.click(
      screen.getByRole("button", { name: /cerrar sesiones/i }),
    );
    const dialogo = await screen.findByRole("dialog");
    const enviar = within(dialogo).getByRole("button", {
      name: /cerrar sesiones/i,
    });
    await userEvent.type(within(dialogo).getByRole("textbox"), "corto");
    await userEvent.click(enviar);
    expect(
      await within(dialogo).findByText(/al menos 8 caracteres/i),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith(
      "/internal/users/5/sessions/revoke",
      expect.anything(),
    );

    await userEvent.type(
      within(dialogo).getByRole("textbox"),
      " portátil extraviado",
    );
    await userEvent.click(enviar);
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/internal/users/5/sessions/revoke",
        { method: "POST", body: { reason: "corto portátil extraviado" } },
      ),
    );
    expect(
      await screen.findByText("Se cerraron 2 sesiones de Ana Pérez."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sin sesiones lo dice", async () => {
    items = [];
    renderWithProviders(<SessionsPage />);
    expect(
      await screen.findByText("Nadie del equipo tiene sesión abierta."),
    ).toBeInTheDocument();
  });

  it("si falla la carga se ve el error con reintento", async () => {
    falla = new Error("sin red");
    renderWithProviders(<SessionsPage />);
    expect(
      await screen.findByText("No se pudieron cargar las sesiones abiertas."),
    ).toBeInTheDocument();
  });
});

describe("describeUserAgent", () => {
  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0",
      "Edge en Windows",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Safari en iOS",
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
      "Firefox en Linux",
    ],
    ["curl/8.7.1", "Otro cliente"],
    [null, "Sin dato"],
    ["   ", "Sin dato"],
  ])("%s → %s", (agente, esperado) => {
    expect(describeUserAgent(agente)).toBe(esperado);
  });
});
