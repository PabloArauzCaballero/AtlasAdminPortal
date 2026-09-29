import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";
import { filtrarPor } from "../../shared/tabla-helpers";

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

const vacio = {
  items: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
};
const consulta = (data: unknown) => ({
  isLoading: false,
  error: null,
  data,
  refetch: vi.fn(),
});
const flowHooks = vi.hoisted(() => ({
  useFlows: vi.fn(),
  useFlowFindings: vi.fn(),
  useFlowsSummary: vi.fn(),
  useFlowModules: vi.fn(),
  useFlowImports: vi.fn(),
  useVerifyFlowsMutation: vi.fn(),
  useFlow: vi.fn(),
}));
vi.mock("@/features/flows/hooks", () => flowHooks);
const reviewHooks = vi.hoisted(() => ({
  useFlowReviewQueue: vi.fn(),
  useReviewFlowMutation: vi.fn(),
}));
vi.mock("@/features/flows/review/hooks", () => reviewHooks);

import { FlowsPage } from "@/features/flows/flows-page";
import { FlowReviewPage } from "@/features/flows/review/flow-review-page";

function renderAs(ui: React.ReactElement, permissions: string[]) {
  setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  flowHooks.useFlows.mockReset().mockReturnValue(consulta(vacio));
  flowHooks.useFlowFindings.mockReset().mockReturnValue(consulta(vacio));
  flowHooks.useFlowsSummary.mockReset().mockReturnValue(consulta({ total: 0 }));
  flowHooks.useFlowModules.mockReset().mockReturnValue(consulta([]));
  flowHooks.useFlowImports.mockReset().mockReturnValue(consulta([{ id: "1" }]));
  flowHooks.useVerifyFlowsMutation
    .mockReset()
    .mockReturnValue({ mutate: vi.fn(), isPending: false, data: undefined });
  flowHooks.useFlow.mockReset().mockReturnValue(consulta(undefined));
  reviewHooks.useFlowReviewQueue.mockReset().mockReturnValue(consulta(vacio));
  reviewHooks.useReviewFlowMutation.mockReset().mockReturnValue({
    isPending: false,
    error: null,
    mutate: vi.fn(),
    reset: vi.fn(),
  });
});

describe("Mapa de rutas · los seis filtros y el de verificación son visibles y explicados", () => {
  it("cada filtro trae su ⓘ y «Rotos» ya no filtra a escondidas", async () => {
    renderAs(<FlowsPage />, ["systems.flows.read"]);
    for (const nombre of [
      "Bloque",
      "Módulo",
      "Riesgo",
      "Verificación",
      "Cliente",
      "Tests",
      "Hallazgos",
    ]) {
      expect(
        screen.getAllByRole("combobox", { name: new RegExp(`^${nombre}`) })
          .length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole("button", { name: new RegExp(`^Ayuda: ${nombre}`) })
          .length,
      ).toBeGreaterThan(0);
    }
    await filtrarPor(/^Verificación/, "BROKEN");
    expect(flowHooks.useFlows).toHaveBeenLastCalledWith(
      expect.objectContaining({ verification: "BROKEN", page: 1 }),
    );
  });

  it("los hallazgos también explican sus filtros y su buscador", () => {
    renderAs(<FlowsPage />, ["systems.flows.read"]);
    expect(
      screen.getByRole("button", {
        name: /Ayuda: Buscar por ruta, módulo o detalle/,
      }),
    ).toBeInTheDocument();
  });
});

describe("Revisión de flujos · el estado es un filtro de la barra", () => {
  it("elegir Aprobados pide reviewStatus=APPROVED y Limpiar vuelve a la cola de pendientes", async () => {
    renderAs(<FlowReviewPage />, ["systems.flows.read"]);
    await filtrarPor(/^Estado de revisión/, "APPROVED");
    expect(reviewHooks.useFlowReviewQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ reviewStatus: "APPROVED" }),
    );
    await userEvent.click(screen.getByRole("button", { name: /limpiar/i }));
    expect(reviewHooks.useFlowReviewQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ reviewStatus: "NEEDS_REVIEW" }),
    );
  });
});
