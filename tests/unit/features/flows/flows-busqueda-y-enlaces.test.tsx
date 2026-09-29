import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

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
const flowHooks = vi.hoisted(() => ({
  useFlowImports: vi.fn(() => ({ data: [{ id: "1" }] })),
  useFlow: vi.fn(),
}));
vi.mock("@/features/flows/hooks", () => flowHooks);
const reviewHooks = vi.hoisted(() => ({
  useFlowReviewQueue: vi.fn(),
  useReviewFlowMutation: vi.fn(() => ({
    isPending: false,
    error: null,
    mutate: vi.fn(),
    reset: vi.fn(),
  })),
}));
vi.mock("@/features/flows/review/hooks", () => reviewHooks);
const asyncHooks = vi.hoisted(() => ({ usePendingWork: vi.fn() }));
vi.mock("@/features/flows/async/hooks", () => asyncHooks);

import { PendingWorkPage } from "@/features/flows/async/pending-work-page";
import { FlowDetailDrawer } from "@/features/flows/flow-detail-drawer";
import { FlowReviewPage } from "@/features/flows/review/flow-review-page";

function renderAs(ui: React.ReactElement, permissions: string[]) {
  setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  flowHooks.useFlow.mockReset().mockReturnValue({
    isLoading: false,
    error: null,
    data: undefined,
    refetch: vi.fn(),
  });
  reviewHooks.useFlowReviewQueue.mockReset().mockReturnValue({
    isLoading: false,
    error: null,
    data: { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    refetch: vi.fn(),
  });
});

describe("Revisión de análisis de flujos · buscador", () => {
  it("se llama así (no «Revisión de flujos») y el texto viaja al servidor como `q`", async () => {
    const user = userEvent.setup();
    renderAs(<FlowReviewPage />, ["systems.flows.read"]);
    expect(
      screen.getByRole("heading", { name: "Revisión de análisis de flujos" }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText("Buscar por nombre, ruta o módulo…"),
      "loans",
    );
    await vi.waitFor(() =>
      expect(reviewHooks.useFlowReviewQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "loans", page: 1 }),
      ),
    );
    expect(
      screen.getByText("Ningún flujo de la cola coincide con la búsqueda"),
    ).toBeInTheDocument();
  });
});

const pendiente = (over: Record<string, unknown>) => ({
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  data: {
    windowDays: 30,
    consumer: { lastRunAt: null, running: true },
    diagnosis: "SIN_PENDIENTES",
    flowsThatEnqueue: 1,
    pending: 0,
    unattributedPending: 0,
    pendingWithoutTenant: 0,
    failed: 0,
    oldestPending: null,
    skipped: [],
    failing: [],
    flows: [],
    ...over,
  },
});

describe("Trabajo pendiente · corte del informe", () => {
  it("si el servidor dice que cortó, se avisa con el tope", () => {
    asyncHooks.usePendingWork.mockReturnValue(
      pendiente({ truncated: true, limit: 500 }),
    );
    renderAs(<PendingWorkPage />, ["systems.flows.read"]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Sólo se enseñan las 500 rutas",
    );
  });

  it("sin corte (o con un servidor anterior que no lo informa) no se afirma nada", () => {
    asyncHooks.usePendingWork.mockReturnValue(pendiente({}));
    renderAs(<PendingWorkPage />, ["systems.flows.read"]);
    expect(screen.queryByText(/Sólo se enseñan las/)).not.toBeInTheDocument();
  });
});

const FLOW = {
  id: "flow_1",
  slug: "loans-create",
  systemCode: "ATLAS_BACKEND",
  name: "Crear préstamo",
  module: "loans",
  kind: "CREATE",
  risk: "HIGH",
  riskBasis: "",
  badges: [],
  discovery: "DERIVED",
  verification: "VERIFIED",
  freshness: "FRESH",
  httpMethod: "POST",
  path: "loans",
  controller: "LoansController",
  handler: "createLoan",
  sourceFile: null,
  sourceLine: null,
  isPublic: false,
  roles: [],
  internalPermissions: [],
  guards: [],
  callers: [],
  testStatus: "TESTED",
  contractStatus: "OK",
  findingsCount: 0,
  verifiedAt: null,
  verifiedBy: null,
  verificationEvidence: {},
  reads: [],
  writes: [],
  analysis: null,
  analyzedCommit: null,
  analyzedBranch: null,
  updatedAt: "2026-09-29T00:00:00.000Z",
  findings: [],
};

describe("Ficha de un flujo · enlace al catálogo de operaciones", () => {
  beforeEach(() => {
    flowHooks.useFlow.mockReturnValue({
      isLoading: false,
      error: null,
      data: FLOW,
      refetch: vi.fn(),
    });
  });

  it("con systems.endpoints.read enlaza la ficha de endpoints por el método del controlador", () => {
    renderAs(<FlowDetailDrawer flowId="flow_1" onClose={vi.fn()} />, [
      "systems.flows.read",
      "systems.endpoints.read",
    ]);
    expect(
      screen.getByRole("link", { name: "Ver en el catálogo de operaciones" }),
    ).toHaveAttribute("href", "/internal/systems/endpoints?q=createLoan");
  });

  it("sin ese permiso no hay enlace (llevaría a «acceso restringido»)", () => {
    renderAs(<FlowDetailDrawer flowId="flow_1" onClose={vi.fn()} />, [
      "systems.flows.read",
    ]);
    expect(
      screen.queryByRole("link", { name: "Ver en el catálogo de operaciones" }),
    ).not.toBeInTheDocument();
  });
});
