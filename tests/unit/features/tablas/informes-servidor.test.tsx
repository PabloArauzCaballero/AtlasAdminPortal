import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";
import {
  buscar,
  cabeceras,
  esTablaHomogenea,
  filasDeDatos,
  filtrarPor,
} from "../../shared/tabla-helpers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/flows",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal: vi.fn(),
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));
const asyncHooks = vi.hoisted(() => ({
  useRbacDrift: vi.fn(),
  usePendingWork: vi.fn(),
}));
vi.mock("@/features/flows/async/hooks", () => asyncHooks);
const systemsHooks = vi.hoisted(() => ({ useTrafficRoutesPage: vi.fn() }));
vi.mock("@/features/systems/traffic-hooks", () => systemsHooks);
vi.mock("@/features/flows/flow-catalog-not-loaded", () => ({
  FlowCatalogNotLoaded: () => null,
}));

import { PendingWorkPage } from "@/features/flows/async/pending-work-page";
import { RbacDriftPage } from "@/features/flows/async/rbac-drift-page";
import { TrafficRoutesTable } from "@/features/systems-dashboard/traffic-routes-table";

const consulta = (data: unknown, extra: Record<string, unknown> = {}) => ({
  isLoading: false,
  error: null,
  data,
  refetch: vi.fn(),
  ...extra,
});

function renderAs(ui: React.ReactElement) {
  setStoredInternalSession(
    makeSession({ user: makeUser({ permissions: ["systems.flows.read"] }) }),
  );
  return render(<AuthProvider>{ui}</AuthProvider>);
}

const item = (
  route: string,
  severity: "SIN_GUARDA" | "SOLO_ROL" | "PUBLIC",
) => ({
  clientCode: "ADMIN_PORTAL",
  route,
  navPermissions: ["x.read"],
  navRoles: [],
  flowId: "flow_aaaaaaaaaaaa",
  method: "GET",
  path: "/x",
  severity,
  roles: [],
});

const deriva = (
  items: ReturnType<typeof item>[],
  meta = { page: 1, limit: 20, total: items.length, totalPages: 1 },
) => ({
  screensWithObservedEdges: 5,
  truncated: false,
  screens: [],
  items,
  meta,
  summary: {
    screensWithDrift: 2,
    calls: 40,
    bySeverity: { SIN_GUARDA: 3, PUBLIC: 1, SOLO_ROL: 36 },
    clients: ["ADMIN_PORTAL", "MOTOR_PORTAL"],
  },
});

beforeEach(() => {
  asyncHooks.useRbacDrift.mockReset();
  asyncHooks.usePendingWork.mockReset();
  systemsHooks.useTrafficRoutesPage.mockReset();
});

describe("Deriva de permisos · tabla en el servidor", () => {
  it("una fila por llamada, cifras del resumen del servidor y filtros que viajan", async () => {
    asyncHooks.useRbacDrift.mockReturnValue(
      consulta(
        deriva([
          item("/internal/a", "SIN_GUARDA"),
          item("/internal/b", "SOLO_ROL"),
        ]),
      ),
    );
    renderAs(<RbacDriftPage />);
    esTablaHomogenea(
      ["Pantalla", "El menú pide", "Desenlace", "Llamada", "Roles de la API"],
      /Buscar por pantalla, ruta, método o flujo/,
    );
    expect(filasDeDatos()).toHaveLength(2);
    // «Llamadas sin guarda» sale del `summary` (3), no de sumar la página (1).
    expect(
      screen.getByText("Llamadas sin guarda").closest("div"),
    ).toHaveTextContent("3");
    await filtrarPor(/^Desenlace/, "SIN_GUARDA");
    expect(asyncHooks.useRbacDrift).toHaveBeenLastCalledWith(
      expect.objectContaining({ severity: "SIN_GUARDA", page: 1, limit: 20 }),
    );
    await filtrarPor(/^Cliente/, "MOTOR_PORTAL");
    expect(asyncHooks.useRbacDrift).toHaveBeenLastCalledWith(
      expect.objectContaining({ clientCode: "MOTOR_PORTAL" }),
    );
    await buscar(/Buscar por pantalla, ruta, método o flujo/, "loans");
    await vi.waitFor(() =>
      expect(asyncHooks.useRbacDrift).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "loans", page: 1 }),
      ),
    );
  });

  it("pagina con el meta del servidor", async () => {
    asyncHooks.useRbacDrift.mockReturnValue(
      consulta(
        deriva([item("/internal/a", "SIN_GUARDA")], {
          page: 1,
          limit: 20,
          total: 45,
          totalPages: 3,
        }),
      ),
    );
    renderAs(<RbacDriftPage />);
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(asyncHooks.useRbacDrift).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it("distingue «nada coincide» de «sin deriva» y muestra el error con reintento", async () => {
    asyncHooks.useRbacDrift.mockReturnValue(consulta(deriva([])));
    const { unmount } = renderAs(<RbacDriftPage />);
    expect(screen.getByText("Sin deriva en lo observado")).toBeInTheDocument();
    await buscar(/Buscar por pantalla, ruta, método o flujo/, "zzz");
    expect(
      await screen.findByText(
        "Ninguna llamada coincide con la búsqueda o los filtros.",
      ),
    ).toBeInTheDocument();
    unmount();
    const refetch = vi.fn();
    asyncHooks.useRbacDrift.mockReturnValue(
      consulta(undefined, { error: new Error("red"), refetch }),
    );
    renderAs(<RbacDriftPage />);
    await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

const flujo = (path: string, pending: number) => ({
  method: "POST",
  path,
  events: pending,
  pending,
  processed: 0,
  failed: 0,
  other: 0,
  pendingWithoutTenant: 0,
  pendingSince: null,
  lastProcessedAt: null,
  skippedByConsumer: false,
  codes: ["x.y"],
});

const trabajo = (
  flows: ReturnType<typeof flujo>[],
  meta?: { page: number; limit: number; total: number; totalPages: number },
) => ({
  windowDays: 30,
  consumer: { lastRunAt: null, running: false },
  diagnosis: "AL_DIA" as const,
  flowsThatEnqueue: flows.length,
  truncated: false,
  pending: 5,
  unattributedPending: 0,
  pendingWithoutTenant: 0,
  failed: 0,
  oldestPending: null,
  skipped: [],
  failing: [],
  flows,
  meta,
});

describe("Trabajo pendiente · los flujos que encolan en tabla del servidor", () => {
  it("buscador, situación y ventana viajan al servidor y pagina con el meta", async () => {
    asyncHooks.usePendingWork.mockReturnValue(
      consulta(
        trabajo([flujo("/a", 3), flujo("/b", 1)], {
          page: 1,
          limit: 20,
          total: 60,
          totalPages: 3,
        }),
      ),
    );
    renderAs(<PendingWorkPage />);
    const tabla = screen.getAllByRole("table")[0]!;
    expect(cabeceras().slice(0, 3)).toEqual(["Flujo", "Eventos", "Pendientes"]);
    expect(tabla).toBeInTheDocument();
    await filtrarPor(/^Situación/, "failed");
    expect(asyncHooks.usePendingWork).toHaveBeenLastCalledWith(
      expect.objectContaining({
        windowDays: 30,
        state: "failed",
        page: 1,
        limit: 20,
      }),
    );
    await buscar(/Buscar por método, ruta o evento/, "loans");
    await vi.waitFor(() =>
      expect(asyncHooks.usePendingWork).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "loans" }),
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(asyncHooks.usePendingWork).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });
});

const ruta = (routeTemplate: string, method: string) => ({
  method,
  routeTemplate,
  totalRequests: 10,
  avgLatencyMs: 5,
  p95LatencyMs: 9,
  errorRate: 0,
  lastSeenAt: null,
});

describe("Tráfico y latencia · las rutas en tabla del servidor", () => {
  it("el buscador y el método viajan, con la página y el límite", async () => {
    systemsHooks.useTrafficRoutesPage.mockReturnValue(
      consulta({
        routes: [ruta("/loans", "GET")],
        meta: { page: 1, limit: 20, total: 70, totalPages: 4 },
      }),
    );
    render(<TrafficRoutesTable windowHours={24} live={false} />);
    expect(cabeceras()).toEqual([
      "Método",
      "Ruta",
      "Requests",
      "Latencia prom.",
      "p95",
      "Error rate",
      "Última vez",
    ]);
    await filtrarPor(/^Método/, "POST");
    expect(systemsHooks.useTrafficRoutesPage).toHaveBeenLastCalledWith(
      24,
      expect.objectContaining({ method: "POST", page: 1, limit: 20 }),
      { live: false },
    );
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(systemsHooks.useTrafficRoutesPage).toHaveBeenLastCalledWith(
      24,
      expect.objectContaining({ page: 2 }),
      { live: false },
    );
  });
});
