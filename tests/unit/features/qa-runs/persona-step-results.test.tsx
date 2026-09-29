import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  listQaRunPersonas: vi.fn(),
  listQaPersonaSteps: vi.fn(),
}));
vi.mock("@/features/qa-runs/run-api", () => api);

const { PersonaStepResults } =
  await import("@/features/qa-runs/persona-step-results");

const persona = (ordinal: number, over: Record<string, unknown> = {}) => ({
  ordinal,
  personaKey: `p-${ordinal}`,
  status: "PASSED",
  caseCategory: "normal",
  archetype: "asalariado",
  resources: {},
  failedStepKey: null,
  reason: null,
  startedAt: null,
  finishedAt: null,
  ...over,
});

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.listQaRunPersonas.mockResolvedValue({
    items: [
      persona(1),
      persona(2, {
        status: "FAILED",
        failedStepKey: "signup",
        reason: "422 VALIDATION_ERROR",
      }),
    ],
    total: 60,
    page: 1,
    limit: 25,
  });
  api.listQaPersonaSteps.mockResolvedValue([
    {
      stepKey: "signup",
      workflowStepCode: "signup",
      status: "FAILED",
      branch: null,
      reason: "422 VALIDATION_ERROR",
      rootCauseStepKey: null,
      failures: [{ code: "X", message: "Campo inválido", path: "$.email" }],
      attempts: [
        {
          attempt: 1,
          status: 422,
          latencyMs: 87,
          admissionLagMs: 3,
          requestId: "req-abc",
        },
      ],
      evidence: { method: "POST", path: "/customers" },
      startedAt: null,
      finishedAt: null,
    },
  ]);
});

const lastQuery = () => api.listQaRunPersonas.mock.calls.at(-1)?.[1];

describe("PersonaStepResults · tabla de personas con la disciplina de las demás", () => {
  it("pinta una tabla con cabeceras, no una lista de botones", async () => {
    renderWithProviders(<PersonaStepResults runId="run-1" live={false} />);
    const region = await screen.findByRole("region", {
      name: "Personas de la corrida",
    });
    const table = await within(region).findByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Persona",
      "Desenlace",
      "Arquetipo",
      "Categoría del caso",
      "Paso que falló",
      "Pasos",
    ]);
    expect(within(table).getByText("Pasó")).toBeInTheDocument();
    expect(within(table).getByText("422 VALIDATION_ERROR")).toBeInTheDocument();
  });

  it("el buscador viaja al servidor como `q` y vuelve a la página 1", async () => {
    renderWithProviders(<PersonaStepResults runId="run-1" live={false} />);
    await screen.findByText("p-1");
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));

    fireEvent.change(
      screen.getByLabelText("Buscar por n.º, arquetipo, paso o motivo…"),
      { target: { value: "422" } },
    );
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ q: "422", page: 1, limit: 25 }),
    );
  });

  it("el filtro de desenlace viaja al servidor y «Limpiar» lo quita", async () => {
    renderWithProviders(<PersonaStepResults runId="run-1" live={false} />);
    await screen.findByText("p-1");
    expect(lastQuery().status).toBeUndefined();

    await elegirOpcion(
      screen.getByRole("combobox", { name: "Desenlace" }),
      "FAILED",
    );
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ status: "FAILED" }),
    );

    await userEvent.click(screen.getByRole("button", { name: /Limpiar/ }));
    await waitFor(() => expect(lastQuery().status).toBeUndefined());
    expect(lastQuery().q).toBeUndefined();
  });

  it("pagina en el servidor: la barra usa el total del servidor", async () => {
    renderWithProviders(<PersonaStepResults runId="run-1" live={false} />);
    await screen.findByText("p-1");
    expect(screen.getByText("60")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));
  });

  it("sin coincidencias dice que nada coincide; sin personas, que la corrida no las tiene", async () => {
    api.listQaRunPersonas.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });
    renderWithProviders(<PersonaStepResults runId="run-1" live={false} />);
    expect(
      await screen.findByText("Esta corrida todavía no tiene personas."),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText("Buscar por n.º, arquetipo, paso o motivo…"),
      { target: { value: "nadie" } },
    );
    expect(
      await screen.findByText("Ninguna persona coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("un fallo del servidor se ve con «Reintentar»", async () => {
    api.listQaRunPersonas.mockRejectedValueOnce(new Error("caído"));
    renderWithProviders(<PersonaStepResults runId="run-1" live={false} />);
    expect(
      await screen.findByText("No se pudieron leer las personas"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(await screen.findByText("p-1")).toBeInTheDocument();
  });

  it("«Ver pasos» abre los pasos de esa persona en otra tabla, con sus intentos", async () => {
    renderWithProviders(<PersonaStepResults runId="run-1" live={false} />);
    await screen.findByText("p-2");
    await userEvent.click(
      screen.getByRole("button", { name: /Ver los pasos de la persona 2/ }),
    );
    const panel = await screen.findByRole("region", {
      name: "Pasos de la persona p-2",
    });
    expect(api.listQaPersonaSteps).toHaveBeenCalledWith("run-1", "p-2");
    expect(await within(panel).findByText("signup")).toBeInTheDocument();

    await userEvent.click(
      within(panel).getByRole("button", { name: /Intentos \(1\)/ }),
    );
    expect(await within(panel).findByText("req-abc")).toBeInTheDocument();
    expect(within(panel).getByText("Campo inválido")).toBeInTheDocument();
    expect(within(panel).getByText("87 ms")).toBeInTheDocument();
  });
});
