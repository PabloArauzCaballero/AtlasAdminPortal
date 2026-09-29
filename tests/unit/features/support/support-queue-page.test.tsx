import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { SupportQueuePage } from "@/features/support/queue-page";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import {
  elegirOpcion,
  valoresDeOpciones,
} from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/internal/support",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: ["support.cases.read"],
    roles: [],
    hasPermission: () => true,
    hasAnyRole: () => true,
  }),
}));

const request = vi.mocked(apiRequest);
const consultas: Array<Record<string, unknown>> = [];
let conResumen = true;
let falla = false;

const caso = (numero: string) => ({
  caseId: numero,
  caseNumber: `SUP-${numero}`,
  title: `Caso ${numero}`,
  caseType: "ACCESS",
  domain: "customer",
  status: "Abierto",
  openedAt: "2026-09-20T10:00:00Z",
  lastActivityAt: null,
  resolvedAt: null,
  closedAt: null,
  internalStatus: "OPEN",
  priority: "P1",
  impact: "HIGH",
  urgency: "HIGH",
  sensitivity: "NORMAL",
  queueId: null,
  categoryId: null,
  assigneeAgentId: null,
  subjectContextType: "customer",
  subjectCustomerId: "9",
  subjectPartnerProfileId: null,
  internalSummary: null,
  escalationLevel: 0,
  transferCount: 0,
  legalHold: false,
  retentionClassCode: null,
  originContext: null,
});

beforeEach(() => {
  consultas.length = 0;
  conResumen = true;
  falla = false;
  request.mockReset();
  request.mockImplementation(async (path, options) => {
    const query = (options?.query ?? {}) as Record<string, unknown>;
    if (path === "/internal/support/cases") {
      consultas.push(query);
      if (falla) throw new Error("sin red");
      return {
        cases: [caso(query.cursorId ? "2" : "1")],
        nextCursor: query.cursorId
          ? null
          : { openedAt: "2026-09-19T10:00:00Z", id: "1" },
        ...(conResumen
          ? { summary: { total: 137, highPriority: 21, unassigned: 55 } }
          : {}),
      };
    }
    if (path === "/internal/support/queues") return { queues: [] };
    if (path === "/internal/support/categories") return { categories: [] };
    if (path === "/internal/support/codes") {
      return { resolutionCodes: [], rootCauseCodes: [] };
    }
    return { channels: [], queued: [], items: [] };
  });
});

describe("Bandeja de soporte (O10)", () => {
  it("las tres tarjetas salen del summary del servidor y dicen que cubren toda la vista", async () => {
    renderWithProviders(<SupportQueuePage />);
    await screen.findByText("SUP-1");
    expect(
      screen.getByText("Casos en esta vista").parentElement,
    ).toHaveTextContent("137");
    expect(screen.getByText("P1 y P2").parentElement).toHaveTextContent("21");
    expect(screen.getByText("Sin agente").parentElement).toHaveTextContent(
      "55",
    );
  });

  it("contra un servidor sin summary la tarjeta lo dice: cuenta sólo la página", async () => {
    conResumen = false;
    renderWithProviders(<SupportQueuePage />);
    await screen.findByText("SUP-1");
    expect(
      screen.getByText("Casos en esta página").parentElement,
    ).toHaveTextContent("1");
  });

  it("el buscador viaja como q y el texto dice por qué campos busca", async () => {
    renderWithProviders(<SupportQueuePage />);
    await screen.findByText("SUP-1");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /número de caso, asunto o código de cliente/i,
      }),
      { target: { value: "CLI-0042" } },
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ q: "CLI-0042" }),
    );
  });

  it("ofrece tipo, motivo, resolución y causa raíz, y el tipo viaja al servidor", async () => {
    renderWithProviders(<SupportQueuePage />);
    await screen.findByText("SUP-1");
    for (const nombre of [/^Tipo/, /^Motivo/, /^Resolución/, /^Causa raíz/]) {
      expect(screen.getByRole("combobox", { name: nombre })).toBeVisible();
    }
    const tipo = screen.getByRole("combobox", { name: /^Tipo/ });
    const valores = await valoresDeOpciones(tipo);
    expect(valores.length).toBeGreaterThan(1);
    await elegirOpcion(tipo, valores[1]);
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ caseType: valores[1] }),
    );
  });

  it("pagina por cursor: Siguiente manda el cursor, Anterior lo suelta", async () => {
    renderWithProviders(<SupportQueuePage />);
    await screen.findByText("SUP-1");
    const anterior = screen.getByRole("button", { name: "Anterior" });
    expect(anterior).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("SUP-2")).toBeInTheDocument();
    expect(consultas.at(-1)).toMatchObject({ cursorId: "1" });
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(await screen.findByText("SUP-1")).toBeInTheDocument();
    expect(consultas.at(-1)?.cursorId).toBeUndefined();
  });

  it("un filtro nuevo vuelve al primer cursor", async () => {
    renderWithProviders(<SupportQueuePage />);
    await screen.findByText("SUP-1");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("SUP-2");
    fireEvent.change(screen.getByRole("textbox", { name: /número de caso/i }), {
      target: { value: "x" },
    });
    await waitFor(() => expect(consultas.at(-1)).toMatchObject({ q: "x" }));
    expect(consultas.at(-1)?.cursorId).toBeUndefined();
  });

  it("si la carga falla se ve el error y hay con qué reintentar", async () => {
    falla = true;
    renderWithProviders(<SupportQueuePage />);
    const reintentar = await screen.findByRole("button", {
      name: /reintentar/i,
    });
    falla = false;
    await userEvent.click(reintentar);
    expect(await screen.findByText("SUP-1")).toBeInTheDocument();
  });
});
