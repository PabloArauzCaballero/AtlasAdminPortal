import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

vi.mock("next/navigation", () => ({
  usePathname: () => "/internal",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal: vi.fn(),
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));
vi.mock("@/features/systems-dashboard/traffic-latency-section", () => ({
  TrafficLatencySection: () => null,
}));
const hooks = vi.hoisted(() => ({
  useDashboard: vi.fn(),
  useToolsHealth: vi.fn(),
}));
vi.mock("@/features/systems/hooks", () => hooks);

import { DashboardPage } from "@/features/systems-dashboard/dashboard-page";

function renderAs(permissions: string[]) {
  setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  hooks.useDashboard.mockReset().mockReturnValue({
    isLoading: false,
    isFetching: false,
    error: null,
    data: {
      counts: { endpoints: 10 },
      posture: { catalogCoverage: "READY_FOR_REVIEW" },
    },
    refetch: vi.fn(),
  });
  hooks.useToolsHealth.mockReset().mockReturnValue({
    isLoading: false,
    error: null,
    data: [
      { code: "BURO", name: "Buró", isCritical: true, isHealthy: false },
      { code: "MAIL", name: "Correo", isCritical: false, isHealthy: false },
    ],
  });
});

/**
 * «Panel de control» se fusionó con Inicio (2026-09-29). Lo único propio del panel —el aviso rojo de
 * herramientas críticas caídas— vive ahora en Inicio, pero sólo para quien tiene el permiso de salud:
 * Inicio lo abren también roles de negocio con `systems.dashboard.read`.
 */
describe("Inicio · aviso de herramientas críticas", () => {
  it("con permiso de salud avisa sólo de las CRÍTICAS caídas y enlaza la pestaña Salud", () => {
    renderAs(["systems.dashboard.read", "systems.tools.health.read"]);
    const aviso = screen.getByRole("alert");
    expect(aviso).toHaveTextContent("Hay 1 herramienta crítica caída");
    expect(aviso).toHaveTextContent("Buró");
    expect(aviso).not.toHaveTextContent("Correo");
    expect(
      screen.getByRole("link", { name: /ver la salud de las herramientas/i }),
    ).toHaveAttribute("href", "/internal/systems/tools?tab=salud");
  });

  it("sin permiso de salud (rol de negocio) ni se pide la salud ni se enseña", () => {
    renderAs(["systems.dashboard.read"]);
    expect(hooks.useToolsHealth).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver salud completa")).not.toBeInTheDocument();
    expect(screen.getByText("Centro interno ATLAS")).toBeInTheDocument();
  });

  it("sin herramientas críticas caídas no hay aviso", () => {
    hooks.useToolsHealth.mockReturnValue({
      isLoading: false,
      error: null,
      data: [{ code: "BURO", name: "Buró", isCritical: true, isHealthy: true }],
    });
    renderAs(["systems.dashboard.read", "systems.tools.health.read"]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
