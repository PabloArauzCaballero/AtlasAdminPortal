import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { runFixture } from "./qa-runs-fixtures";

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  getQaRun: vi.fn(),
  listQaRunPersonas: vi.fn(),
  listQaPersonaSteps: vi.fn(),
  cancelQaRun: vi.fn(),
}));
vi.mock("@/features/qa-runs/run-api", () => api);

const { RunProgress } = await import("@/features/qa-runs/run-progress");

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.listQaRunPersonas.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 25,
  });
  api.cancelQaRun.mockResolvedValue({ runId: "run-1", status: "CANCELLING" });
});

const COMPLETED = {
  status: "COMPLETED" as const,
  finishedAt: "2026-09-24T12:05:00.000Z",
};

describe("RunProgress · UI/contrato con respuestas simuladas del contrato QA", () => {
  it("COMPLETED con veredicto FAILED dice «Falló», nunca «Pasó»", async () => {
    api.getQaRun.mockResolvedValue(
      runFixture({ ...COMPLETED, verdict: "FAILED" }),
    );
    renderWithProviders(<RunProgress runId="run-1" />);

    expect(await screen.findByText("Estado: Terminada")).toBeInTheDocument();
    expect(screen.getByText("Veredicto: Falló")).toBeInTheDocument();
    expect(screen.queryByText(/Pasó/)).not.toBeInTheDocument();
  });

  it("passRate null es «sin muestras», no 100 % ni 0 %", async () => {
    const base = runFixture();
    api.getQaRun.mockResolvedValue(
      runFixture({
        ...COMPLETED,
        verdict: "INCONCLUSIVE",
        counters: { ...base.counters, passRate: null },
      }),
    );
    renderWithProviders(<RunProgress runId="run-1" />);

    expect(await screen.findByText("sin muestras")).toBeInTheDocument();
    expect(screen.queryByText(/100 %/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^0 %/)).not.toBeInTheDocument();
  });

  it("muestra personas terminadas sobre solicitadas y las activas", async () => {
    api.getQaRun.mockResolvedValue(runFixture());
    renderWithProviders(<RunProgress runId="run-1" />);

    const finished = await screen.findByText("Personas terminadas");
    expect(finished.parentElement).toHaveTextContent("5 / 20");
    expect(screen.getByText("Activas ahora").parentElement).toHaveTextContent(
      "5",
    );
  });

  it.each([null, false])(
    "sin mockConfirmed === true (%s) no dice «Mock confirmado»",
    async (mockConfirmed) => {
      api.getQaRun.mockResolvedValue(
        runFixture({
          evidence: {
            mockNamespace: true,
            mockConfirmed,
            providerCalls: 3,
            detail: "",
          },
        }),
      );
      renderWithProviders(<RunProgress runId="run-1" />);

      expect(await screen.findByText("Mock sin confirmar")).toBeInTheDocument();
      expect(screen.queryByText("Mock confirmado")).not.toBeInTheDocument();
    },
  );

  it("con mockConfirmed true dice «Mock confirmado»", async () => {
    api.getQaRun.mockResolvedValue(
      runFixture({
        evidence: {
          mockNamespace: true,
          mockConfirmed: true,
          providerCalls: 3,
          detail: "",
        },
      }),
    );
    renderWithProviders(<RunProgress runId="run-1" />);

    expect(await screen.findByText("Mock confirmado")).toBeInTheDocument();
  });

  it("la causa raíz va antes que los conteos por paso", async () => {
    api.getQaRun.mockResolvedValue(
      runFixture({
        ...COMPLETED,
        verdict: "FAILED",
        rootCauses: [
          { stepKey: "signup", reason: "422 VALIDATION_ERROR", personas: 3 },
        ],
        steps: [
          {
            stepKey: "signup",
            workflowStepCode: "signup",
            endpoint: "POST /customers",
            passed: 1,
            failed: 3,
            skipped: 0,
            notApplicable: 0,
            indeterminate: 0,
            cancelled: 0,
          },
          {
            stepKey: "login",
            workflowStepCode: "login",
            endpoint: "POST /auth/login",
            passed: 1,
            failed: 0,
            skipped: 3,
            notApplicable: 0,
            indeterminate: 0,
            cancelled: 0,
          },
        ],
      }),
    );
    renderWithProviders(<RunProgress runId="run-1" />);

    const cause = await screen.findByText(/422 VALIDATION_ERROR/);
    const table = screen.getByRole("table", { name: "Resultado por paso" });
    expect(
      cause.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("cancelar deja el botón en «Cancelando…» hasta el estado terminal", async () => {
    api.getQaRun.mockResolvedValue(runFixture());
    renderWithProviders(<RunProgress runId="run-1" />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Cancelar corrida/ }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancelar corrida" }),
    );

    expect(
      await screen.findByRole("button", { name: /Cancelando…/ }),
    ).toBeDisabled();
    expect(api.cancelQaRun).toHaveBeenCalledWith("run-1");
  });

  it("en estado terminal no ofrece cancelar", async () => {
    api.getQaRun.mockResolvedValue(
      runFixture({ ...COMPLETED, verdict: "PASSED" }),
    );
    renderWithProviders(<RunProgress runId="run-1" />);

    expect(await screen.findByText("Veredicto: Pasó")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cancelar corrida/ }),
    ).not.toBeInTheDocument();
  });

  it("las personas se rotulan con los estados oficiales en lenguaje de usuario", async () => {
    api.getQaRun.mockResolvedValue(runFixture());
    api.listQaRunPersonas.mockResolvedValue({
      items: [
        {
          ordinal: 1,
          personaKey: "p-1",
          status: "RUNNING",
          caseCategory: "normal",
          archetype: "asalariado",
          resources: {},
          failedStepKey: null,
          reason: null,
          startedAt: null,
          finishedAt: null,
        },
        {
          ordinal: 2,
          personaKey: "p-2",
          status: "PENDING",
          caseCategory: "normal",
          archetype: "asalariado",
          resources: {},
          failedStepKey: null,
          reason: null,
          startedAt: null,
          finishedAt: null,
        },
      ],
      total: 2,
      page: 1,
      limit: 25,
    });
    renderWithProviders(<RunProgress runId="run-1" />);

    const list = await screen.findByRole("region", {
      name: "Personas de la corrida",
    });
    expect(await within(list).findByText("En curso")).toBeInTheDocument();
    expect(within(list).getByText("Pendiente")).toBeInTheDocument();
  });
});
