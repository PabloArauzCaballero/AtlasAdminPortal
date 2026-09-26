import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { runFixture } from "./qa-runs-fixtures";

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  listQaRunEvents: vi.fn(),
  getQaRunEvidence: vi.fn(),
}));
vi.mock("@/features/qa-runs/run-api", () => api);

const { RunEventsPanel, RunEvidencePanel } =
  await import("@/features/qa-runs/run-audit-panels");

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe("RunEventsPanel · diario por cursor (GET /systems/qa/runs/:runId/events)", () => {
  it("no pide nada plegado; al abrir pide desde el cursor 0 y pinta cada hito en español", async () => {
    api.listQaRunEvents.mockResolvedValue({
      items: [
        {
          sequence: 1,
          type: "RUN_QUEUED",
          payload: {},
          createdAt: "2026-09-24T12:00:00.000Z",
        },
        {
          sequence: 2,
          type: "RUN_STARTED",
          payload: { persons: 5, concurrency: 2 },
          createdAt: "2026-09-24T12:00:01.000Z",
        },
        {
          sequence: 3,
          type: "PERSONA_FINISHED",
          payload: {
            personaKey: "p-001",
            status: "FAILED",
            failedStepKey: "login",
          },
          createdAt: "2026-09-24T12:00:05.000Z",
        },
      ],
      nextCursor: 3,
    });
    renderWithProviders(<RunEventsPanel runId="run-1" live={false} />);
    expect(api.listQaRunEvents).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: /Diario de la corrida/ }),
    );

    expect(await screen.findByText("Corrida en cola")).toBeInTheDocument();
    expect(screen.getByText("5 personas, 2 a la vez")).toBeInTheDocument();
    expect(
      screen.getByText("p-001 · FAILED · falló en login"),
    ).toBeInTheDocument();
    expect(api.listQaRunEvents).toHaveBeenCalledWith("run-1", 0);
  });

  it("sin eventos lo dice, no deja la sección en blanco", async () => {
    api.listQaRunEvents.mockResolvedValue({ items: [], nextCursor: 0 });
    renderWithProviders(<RunEventsPanel runId="run-1" live={false} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Diario de la corrida/ }),
    );
    expect(await screen.findByText("Sin eventos todavía")).toBeInTheDocument();
  });
});

describe("RunEvidencePanel · manifiesto (GET /systems/qa/runs/:runId/evidence)", () => {
  it("al abrir enseña huellas, semilla y veredicto", async () => {
    const run = runFixture();
    api.getQaRunEvidence.mockResolvedValue({
      runId: "run-1",
      planHash: "plan-abc",
      recipeHash: "receta-def",
      generatorVersion: "1.0.0",
      seed: "semilla-qa",
      namespace: "qa-run-1",
      referenceDate: "2026-09-24",
      plan: {},
      counters: run.counters,
      verdict: "PASSED",
      steps: [],
      evidence: { mockConfirmed: true },
    });
    renderWithProviders(<RunEvidencePanel runId="run-1" status="COMPLETED" />);
    expect(api.getQaRunEvidence).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: /Evidencia de la corrida/ }),
    );

    expect(await screen.findByText("plan-abc")).toBeInTheDocument();
    expect(screen.getByText("receta-def")).toBeInTheDocument();
    expect(screen.getByText("semilla-qa")).toBeInTheDocument();
    expect(screen.getByText("Pasó")).toBeInTheDocument();
    expect(screen.getByText("Detalle técnico del cierre")).toBeInTheDocument();
    expect(api.getQaRunEvidence).toHaveBeenCalledWith("run-1");
  });

  it("un fallo de lectura se muestra con opción de reintentar", async () => {
    api.getQaRunEvidence.mockRejectedValue(new Error("caída"));
    renderWithProviders(<RunEvidencePanel runId="run-1" status="COMPLETED" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Evidencia de la corrida/ }),
    );
    expect(
      await screen.findByText("No se pudo leer la evidencia"),
    ).toBeInTheDocument();
  });
});
