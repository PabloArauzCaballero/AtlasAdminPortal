import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/systems/tools",
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal: vi.fn(),
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));
const hooks = vi.hoisted(() => ({
  useTools: vi.fn(),
  useToolsHealth: vi.fn(),
}));
vi.mock("@/features/systems/hooks", () => hooks);

import {
  TOOL_STATUS_OPTIONS,
  ToolsPage,
} from "@/features/systems-tools/tools-page";

function renderAs(permissions: string[]) {
  setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
  return render(
    <AuthProvider>
      <ToolsPage />
    </AuthProvider>,
  );
}

beforeEach(() => {
  nav.replace.mockReset();
  nav.params = new URLSearchParams();
  hooks.useTools.mockReset().mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      items: [
        {
          toolId: "1",
          code: "BURO",
          name: "Buró",
          type: "EXTERNAL",
          provider: "Infocred",
          isCritical: true,
          requiresCredentials: true,
          hasSandbox: false,
          status: "ACTIVE",
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    },
    refetch: vi.fn(),
  });
  hooks.useToolsHealth.mockReset().mockReturnValue({
    isLoading: false,
    isFetching: false,
    error: null,
    data: [{ code: "BURO", name: "Buró", isCritical: true, isHealthy: false }],
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  });
});

describe("Herramientas · pestañas Catálogo y Salud", () => {
  it("con los dos permisos enseña las dos pestañas y abre Catálogo", () => {
    renderAs(["systems.tools.read", "systems.tools.health.read"]);
    expect(
      screen.getByRole("button", { name: "Catálogo" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salud" })).toBeInTheDocument();
    expect(screen.getByText("Infocred")).toBeInTheDocument();
    expect(hooks.useToolsHealth).not.toHaveBeenCalled();
  });

  it("?tab=salud (adonde redirige la ruta vieja) abre la salud", () => {
    nav.params = new URLSearchParams("tab=salud");
    renderAs(["systems.tools.read", "systems.tools.health.read"]);
    expect(screen.getByText(/Hay 1 herramienta caída/)).toBeInTheDocument();
    expect(hooks.useTools).not.toHaveBeenCalled();
  });

  it("pulsar Salud deja la pestaña en la URL", async () => {
    const user = userEvent.setup();
    renderAs(["systems.tools.read", "systems.tools.health.read"]);
    await user.click(screen.getByRole("button", { name: "Salud" }));
    expect(nav.replace).toHaveBeenCalledWith(
      "/internal/systems/tools?tab=salud",
      { scroll: false },
    );
  });

  it("sin permiso de salud no hay pestaña Salud, ni aunque la URL la pida", () => {
    nav.params = new URLSearchParams("tab=salud");
    renderAs(["systems.tools.read"]);
    expect(
      screen.queryByRole("button", { name: "Salud" }),
    ).not.toBeInTheDocument();
    expect(hooks.useToolsHealth).not.toHaveBeenCalled();
    expect(screen.getByText("Infocred")).toBeInTheDocument();
  });

  it("sólo con permiso de salud (la pantalla vieja) se ve la salud y no el catálogo", () => {
    renderAs(["systems.tools.health.read"]);
    expect(hooks.useTools).not.toHaveBeenCalled();
    expect(screen.getByText(/Hay 1 herramienta caída/)).toBeInTheDocument();
  });

  it("el buscador dice por qué campos busca y viaja al servidor", async () => {
    const user = userEvent.setup();
    renderAs(["systems.tools.read"]);
    expect(
      screen.getByPlaceholderText(
        "Buscar por código, nombre, proveedor o tipo…",
      ),
    ).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText(
        "Buscar por código, nombre, proveedor o tipo…",
      ),
      "info",
    );
    await vi.waitFor(() =>
      expect(hooks.useTools).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "info", page: 1 }),
      ),
    );
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByText("BURO")).toBeInTheDocument();
  });

  it("las opciones de estado son las del CHECK de la base, no las de la página cargada", () => {
    expect(TOOL_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      "ACTIVE",
      "PLANNED",
      "DEPRECATED",
      "DISABLED",
    ]);
  });
});
