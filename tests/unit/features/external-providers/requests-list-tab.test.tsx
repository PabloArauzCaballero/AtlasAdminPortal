import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { RequestsListTab } from "@/features/external-providers-admin/requests-list-tab";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import {
  elegirOpcion,
  valoresDeOpciones,
} from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);
const consultas: Array<Record<string, unknown>> = [];
let conMeta = true;
let falla = false;

const solicitud = (pagina: number) => ({
  requestId: String(1000 + pagina),
  providerCode: "SEGIP",
  customerId: "42",
  requestType: "identity_verification",
  purposeCode: null,
  decisionStage: null,
  modeUsed: null,
  responseStatus: "COMPLETED",
  responseCode: null,
  approvalStatus: pagina === 2 ? "approved" : null,
  latencyMs: 120,
  estimatedCostAmount: null,
  actualCostAmount: null,
  currency: null,
  errorMessageSafe: null,
  requestedAt: "2026-09-20T10:00:00Z",
  respondedAt: null,
});

beforeEach(() => {
  consultas.length = 0;
  conMeta = true;
  falla = false;
  request.mockReset();
  request.mockImplementation(async (path, options) => {
    if (!path.endsWith("/requests")) {
      return [
        { code: "SEGIP", name: "SEGIP", description: null },
        { code: "ASFI", name: "ASFI", description: null },
      ];
    }
    const query = (options?.query ?? {}) as Record<string, unknown>;
    consultas.push(query);
    if (falla) throw new Error("sin red");
    const offset = Number(query.offset ?? 0);
    const pagina = offset / 25 + 1;
    return {
      total: 60,
      limit: 25,
      offset,
      ...(conMeta
        ? { meta: { page: pagina, limit: 25, total: 60, totalPages: 3 } }
        : {}),
      requests: [solicitud(pagina)],
    };
  });
});

describe("Solicitudes a proveedores (P2)", () => {
  it("el buscador viaja como q y el texto dice qué busca", async () => {
    renderWithProviders(<RequestsListTab />);
    await screen.findByText("1001");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /ID de solicitud, referencia del proveedor, tipo o error/i,
      }),
      { target: { value: "timeout" } },
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ q: "timeout", offset: 0 }),
    );
  });

  it("proveedor sale del catálogo del servidor, y proveedor, desenlace y aprobación viajan", async () => {
    renderWithProviders(<RequestsListTab />);
    await screen.findByText("1001");
    const proveedor = screen.getByRole("combobox", { name: /^Proveedor/ });
    await waitFor(async () =>
      expect(await valoresDeOpciones(proveedor)).toEqual(["", "SEGIP", "ASFI"]),
    );
    await elegirOpcion(proveedor, "ASFI");
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Aprobación/ }),
      "approved_inline",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({
        providerCode: "ASFI",
        approvalStatus: "approved_inline",
      }),
    );
  });

  it("el cliente sólo viaja si son dígitos; otro texto no filtra y no rompe el servidor", async () => {
    renderWithProviders(<RequestsListTab />);
    await screen.findByText("1001");
    const cliente = screen.getByLabelText(/Cliente \(ID\)/);
    fireEvent.change(cliente, { target: { value: "42" } });
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ customerId: "42" }),
    );
    fireEvent.change(cliente, { target: { value: "42x" } });
    await waitFor(() => expect(consultas.at(-1)?.customerId).toBeUndefined());
  });

  it("pagina con el meta del servidor: la página 2 pide offset 25", async () => {
    renderWithProviders(<RequestsListTab />);
    await screen.findByText("1001");
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("1002")).toBeInTheDocument();
    expect(consultas.at(-1)).toMatchObject({ offset: 25, limit: 25 });
    expect(screen.getByText("Aprobada por un administrador")).toBeVisible();
  });

  it("contra un Core sin meta calcula la paginación desde el total", async () => {
    conMeta = false;
    renderWithProviders(<RequestsListTab />);
    await screen.findByText("1001");
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("1002")).toBeInTheDocument();
  });

  it("si falla ofrece reintentar", async () => {
    falla = true;
    renderWithProviders(<RequestsListTab />);
    const reintentar = await screen.findByRole("button", {
      name: /reintentar/i,
    });
    falla = false;
    await userEvent.click(reintentar);
    expect(await screen.findByText("1001")).toBeInTheDocument();
  });
});
