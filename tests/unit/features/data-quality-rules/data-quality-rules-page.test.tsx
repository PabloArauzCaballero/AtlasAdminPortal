import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { DataQualityRulesPage } from "@/features/data-quality-rules/data-quality-rules-page";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import {
  elegirOpcion,
  valoresDeOpciones,
} from "../../../unit/shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: ["dataQuality.rules.read"],
    roles: [],
    hasPermission: () => true,
  }),
}));

const request = vi.mocked(apiRequest);
const consultas: Array<Record<string, unknown>> = [];

const regla = (i: number) => ({
  ruleId: String(i),
  ruleCode: `DQ_${i}`,
  ruleName: `Regla ${i}`,
  description: null,
  targetTable: "customer.customers",
  targetField: null,
  ruleType: "ingesta",
  severity: "MEDIUM",
  status: "ACTIVE",
  frequency: null,
  owner: null,
  expectedAction: null,
  checkConfig: null,
  definitionUpdatedAt: null,
  openIssues: i,
});

beforeEach(() => {
  consultas.length = 0;
  request.mockReset();
  request.mockImplementation(async (_path, options) => {
    const query = (options?.query ?? {}) as Record<string, unknown>;
    consultas.push(query);
    return {
      items: [regla(Number(query.page ?? 1))],
      meta: { page: query.page ?? 1, limit: 20, total: 41, totalPages: 3 },
      summary: { total: 41, critical: 7, active: 40, pendingIssues: 12 },
    };
  });
});

describe("Reglas de calidad (L6)", () => {
  it("las tarjetas salen del summary del servidor, no de sumar la página", async () => {
    renderWithProviders(<DataQualityRulesPage />);
    await screen.findByText("Regla 1");
    expect(screen.getByText("Críticas").parentElement).toHaveTextContent("7");
    expect(
      screen.getByText("Incidencias pendientes").parentElement,
    ).toHaveTextContent("12");
    expect(screen.getByText("Activas").parentElement).toHaveTextContent("40");
  });

  it("severidad y estado ofrecen opciones fijas aunque la página no las tenga, y viajan al servidor", async () => {
    renderWithProviders(<DataQualityRulesPage />);
    await screen.findByText("Regla 1");
    const severidad = screen.getByRole("combobox", { name: /Severidad/ });
    expect(await valoresDeOpciones(severidad)).toEqual([
      "",
      "CRITICAL",
      "HIGH",
      "MEDIUM",
      "LOW",
    ]);
    await elegirOpcion(severidad, "CRITICAL");
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Estado/ }),
      "INACTIVE",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({
        severity: "CRITICAL",
        status: "INACTIVE",
        page: 1,
      }),
    );
  });

  it("el buscador viaja como q y ya no promete buscar por «dueño»", async () => {
    renderWithProviders(<DataQualityRulesPage />);
    await screen.findByText("Regla 1");
    const buscador = screen.getByRole("textbox", {
      name: /código, nombre, tabla o campo/i,
    });
    expect(screen.queryByPlaceholderText(/dueño/i)).not.toBeInTheDocument();
    fireEvent.change(buscador, { target: { value: "tel" } });
    await waitFor(() => expect(consultas.at(-1)).toMatchObject({ q: "tel" }));
  });

  it("pagina en el servidor y no presenta «Última ejecución» ni «Dueño» como datos", async () => {
    renderWithProviders(<DataQualityRulesPage />);
    await screen.findByText("Regla 1");
    expect(screen.queryByText("Última ejecución")).not.toBeInTheDocument();
    expect(screen.queryByText("Dueño")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Regla 2")).toBeInTheDocument();
    expect(consultas.at(-1)).toMatchObject({ page: 2 });
  });
});
