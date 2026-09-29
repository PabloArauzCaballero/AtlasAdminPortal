import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { filtrarAgentes } from "@/features/support/agent-columns";
import { SupportAgentsPage } from "@/features/support/agents-page";
import type { SupportAgentProfile } from "@/features/support/types";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: [],
    roles: [],
    hasPermission: () => true,
    hasAnyRole: () => true,
  }),
}));
// Sin permiso para leer al personal el selector cae al campo manual; aquí no se prueba.
vi.mock("@/features/support/internal-user-picker", () => ({
  SelectorUsuarioInterno: () => null,
}));

const agente = (
  id: string,
  parte: Partial<SupportAgentProfile>,
): SupportAgentProfile => ({
  agentProfileId: id,
  internalUserId: id,
  email: `agente${id}@atlas.test`,
  fullName: `Agente ${id}`,
  roleCode: "support",
  supportLevel: "L1",
  defaultQueueId: null,
  maxConcurrentChannels: 3,
  activeChannelCount: 0,
  presenceState: "OFFLINE",
  employmentStatus: "ACTIVE",
  isActive: true,
  ...parte,
});

const TODOS = [
  agente("1", { fullName: "Ana Quispe" }),
  agente("2", { supportLevel: "L2", isActive: false }),
  agente("3", { fullName: null, email: null }),
];

describe("Agentes de la mesa: la lista llega completa y se filtra entera", () => {
  it("busca por nombre o correo sin acentos, y sobrevive a un agente sin nombre ni correo", () => {
    const sin = { estado: "", nivel: "" };
    expect(filtrarAgentes(TODOS, { ...sin, q: "QUISPE" })).toHaveLength(1);
    expect(filtrarAgentes(TODOS, { ...sin, q: "agente2@" })).toHaveLength(1);
    expect(filtrarAgentes(TODOS, { ...sin, q: "" })).toHaveLength(3);
  });

  it("estado y nivel se combinan", () => {
    expect(
      filtrarAgentes(TODOS, { q: "", estado: "activo", nivel: "" }),
    ).toHaveLength(2);
    expect(
      filtrarAgentes(TODOS, { q: "", estado: "baja", nivel: "L2" }),
    ).toHaveLength(1);
    expect(
      filtrarAgentes(TODOS, { q: "", estado: "activo", nivel: "L2" }),
    ).toHaveLength(0);
  });
});

describe("Pantalla de agentes", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockImplementation(async (path) =>
      path === "/internal/support/desk/agents"
        ? { agents: TODOS }
        : { queues: [] },
    );
  });

  it("el texto del buscador dice que la lista llega completa y por qué campos busca", async () => {
    renderWithProviders(<SupportAgentsPage />);
    expect(await screen.findByText("Ana Quispe")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /nombre o correo/i }),
    ).toBeInTheDocument();
  });
});
