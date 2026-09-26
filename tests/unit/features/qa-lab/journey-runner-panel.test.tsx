import { elegirOpcion } from "../../shared/option-select-helpers";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import type {
  QaJourneyBatchResult,
  QaJourneyRunResult,
} from "@/features/qa-lab/journey-types";
import { endpointFixture } from "./endpoint-fixture";

vi.setConfig({ testTimeout: 30000 });

const useEndpointsByIds = vi.hoisted(() => vi.fn());
const runJourneyBatch = vi.hoisted(() => vi.fn());

vi.mock("@/features/systems/hooks", () => ({ useEndpointsByIds }));
vi.mock("@/features/qa-lab/journey-runner", () => ({ runJourneyBatch }));
vi.mock("@/features/qa-lab/journey-step-endpoint-select", () => ({
  JourneyStepEndpointSelect: () => null,
}));

const { JourneyRunnerPanel } =
  await import("@/features/qa-lab/journey-runner-panel");

const OK_RUN: QaJourneyRunResult = {
  startedAt: "2026-07-17T10:00:00.000Z",
  finishedAt: "2026-07-17T10:00:01.000Z",
  totalSteps: 1,
  passedSteps: 1,
  failedSteps: 0,
  context: { customerId: "c-1" },
  steps: [
    {
      key: "health",
      name: "Health check",
      endpointId: "ep-1",
      method: "GET",
      url: "http://localhost:3005/api/v1/health",
      httpStatus: 200,
      ok: true,
      passed: true,
      latencyMs: 9,
      extracted: {},
    },
  ],
};

function batchOf(run: QaJourneyRunResult): QaJourneyBatchResult {
  return {
    iterations: 1,
    concurrency: 1,
    seed: "qa-base",
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    passedIterations: run.failedSteps === 0 ? 1 : 0,
    failedIterations: run.failedSteps === 0 ? 0 : 1,
    runs: [{ index: 0, persona: {}, result: run }],
  };
}

beforeEach(() => {
  runJourneyBatch.mockReset();
  runJourneyBatch.mockResolvedValue(batchOf(OK_RUN));
  useEndpointsByIds.mockReturnValue({
    isLoading: false,
    byId: { "ep-1": endpointFixture() },
  });
});

function render_() {
  return renderWithProviders(<JourneyRunnerPanel />);
}

async function switchToJson() {
  await userEvent.click(screen.getByRole("button", { name: "JSON / archivo" }));
}

async function writeSteps(json: string) {
  await switchToJson();
  const textarea = screen.getByRole("textbox", {
    name: /Especificación de pasos/,
  });
  await userEvent.clear(textarea);
  // `paste` y no `type`: el JSON lleva llaves, que userEvent interpreta.
  await userEvent.click(textarea);
  await userEvent.paste(json);
}

function previewButton() {
  return screen.getByRole("button", { name: /Previsualizar \(dry-run\)/ });
}

function realButton() {
  return screen.getByRole("button", { name: /Ejecutar journey real/ });
}

describe("JourneyRunnerPanel · pasos por defecto", () => {
  it("arranca con un ejemplo editable en vez de un editor en blanco", () => {
    render_();

    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("consulta al catálogo los endpoints que la secuencia referencia", () => {
    // Sin sus definiciones el runner no sabe método ni ruta de cada paso.
    render_();

    expect(useEndpointsByIds).toHaveBeenCalledWith([
      "REEMPLAZA_CON_ID_DE_/health",
      "REEMPLAZA_CON_ID_DE_/customer-onboarding/start",
      "REEMPLAZA_CON_ID_DE_/operations/customers/:customerId/investigation-summary",
    ]);
  });

  it("ofrece los dos modos como botones separados, no un checkbox que cambia el rótulo de uno solo", () => {
    // Ver journey-runner-panel.tsx: un solo botón con rótulo condicionado a un checkbox lejano es
    // justo lo que hacía fácil pulsar "ejecutar real" sin notar que dry-run seguía marcado.
    render_();

    expect(previewButton()).toBeInTheDocument();
    expect(realButton()).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /dry-run/i }),
    ).not.toBeInTheDocument();
  });
});

describe("JourneyRunnerPanel · pasos inválidos", () => {
  it("con un JSON roto no se puede ejecutar", async () => {
    render_();

    await writeSteps("no soy json");

    expect(previewButton()).toBeDisabled();
    expect(realButton()).toBeDisabled();
  });

  it("un array vacío tampoco es ejecutable", async () => {
    render_();

    await writeSteps("[]");

    expect(previewButton()).toBeDisabled();
  });

  it("un paso sin endpointId se rechaza señalando cuál", async () => {
    // Ejecutar un paso sin endpoint solo produce un error opaco a mitad del
    // journey, cuando los pasos previos ya escribieron.
    render_();

    await writeSteps('[{"key":"a"}]');

    expect(previewButton()).toBeDisabled();
  });

  it("una secuencia válida sí es ejecutable", async () => {
    render_();

    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');

    expect(previewButton()).toBeEnabled();
    expect(realButton()).toBeEnabled();
  });
});

describe("JourneyRunnerPanel · ejecución", () => {
  it("«Previsualizar» pide confirmación y dice que no manda tráfico real", async () => {
    render_();
    await writeSteps(
      '[{"key":"a","endpointId":"ep-1"},{"key":"b","endpointId":"ep-1"}]',
    );

    await userEvent.click(previewButton());

    expect(
      within(screen.getByRole("dialog")).getByText(
        /Se previsualizarán 2 pasos encadenados en LOCAL\. No se manda tráfico real\./,
      ),
    ).toBeInTheDocument();
    expect(runJourneyBatch).not.toHaveBeenCalled();
  });

  it("«Ejecutar journey real» pide confirmación mencionando la cantidad de personas", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');

    await userEvent.click(realButton());

    expect(
      within(screen.getByRole("dialog")).getByText(
        /Se ejecutarán de verdad 1 pasos encadenados en LOCAL, 1 vez \(1 persona simulada, semilla «qa-base»\)\./,
      ),
    ).toBeInTheDocument();
  });

  it("confirmar «Previsualizar» corre el lote en dry-run con los pasos, la config y el catálogo", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(previewButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    await waitFor(() => expect(runJourneyBatch).toHaveBeenCalledTimes(1));
    expect(runJourneyBatch.mock.calls[0][0]).toEqual([
      { key: "a", endpointId: "ep-1" },
    ]);
    expect(runJourneyBatch.mock.calls[0][1]).toMatchObject({
      dryRun: true,
      environment: "LOCAL",
      iterations: 1,
    });
    expect(runJourneyBatch.mock.calls[0][2]).toEqual({
      "ep-1": endpointFixture(),
    });
  });

  it("un journey real fuera de LOCAL exige teclear EJECUTAR", async () => {
    // Encadena escrituras reales: es el freno más importante del panel.
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await elegirOpcion(
      screen.getByRole("combobox", { name: "Ambiente" }),
      "STAGING",
    );

    await userEvent.click(realButton());

    expect(screen.getByRole("button", { name: "Ejecutar" })).toBeDisabled();
    expect(runJourneyBatch).not.toHaveBeenCalled();
  });

  it("un journey real en LOCAL no exige la frase", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');

    await userEvent.click(realButton());

    expect(screen.getByRole("button", { name: "Ejecutar" })).toBeEnabled();
  });

  it("cancelar no corre nada", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(previewButton());

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(runJourneyBatch).not.toHaveBeenCalled();
  });

  it("mientras se resuelve el catálogo los botones quedan ocupados", () => {
    // Correr sin las definiciones dejaría todos los pasos omitidos.
    useEndpointsByIds.mockReturnValue({ isLoading: true, byId: {} });
    render_();

    expect(
      screen.getByRole("button", { name: /Previsualizando/ }),
    ).toBeDisabled();
  });
});

describe("JourneyRunnerPanel · resultado y errores", () => {
  it("el resultado del journey se muestra al terminar", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(previewButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(await screen.findByText("1/1 pasos OK")).toBeInTheDocument();
    expect(screen.getByText("Contexto final del journey")).toBeInTheDocument();
  });

  it("un journey con pasos fallidos se ve como tal, no como uno vacío", async () => {
    const failedRun: QaJourneyRunResult = {
      ...OK_RUN,
      passedSteps: 0,
      failedSteps: 1,
      steps: [
        {
          ...OK_RUN.steps[0],
          passed: false,
          ok: false,
          httpStatus: 500,
          error: "HTTP 500 fuera de los esperados",
        },
      ],
    };
    runJourneyBatch.mockResolvedValue(batchOf(failedRun));
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(previewButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(await screen.findByText("WARNING")).toBeInTheDocument();
    expect(
      screen.getByText("HTTP 500 fuera de los esperados"),
    ).toBeInTheDocument();
  });

  it("un fallo del runner se lee en vez de perderse", async () => {
    runJourneyBatch.mockRejectedValue(new Error("Host no permitido para QA."));
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(previewButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(
      await screen.findByText(/Host no permitido para QA\./),
    ).toBeInTheDocument();
  });

  it("un archivo con JSON inválido se reporta como error de pasos", async () => {
    render_();
    await switchToJson();

    await userEvent.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      new File(["{no json"], "malo.json", { type: "application/json" }),
    );

    expect(
      await screen.findByText("JSON de pasos inválido"),
    ).toBeInTheDocument();
    expect(
      screen.getByText('El archivo "malo.json" no contiene JSON válido.'),
    ).toBeInTheDocument();
  });

  it("un lote de varias personas se ve como lote, con su agregado y cada persona expandible", async () => {
    runJourneyBatch.mockResolvedValue({
      iterations: 3,
      concurrency: 2,
      seed: "qa-base",
      startedAt: OK_RUN.startedAt,
      finishedAt: OK_RUN.finishedAt,
      passedIterations: 2,
      failedIterations: 1,
      runs: [
        { index: 0, persona: { documentNumber: "1" }, result: OK_RUN },
        { index: 1, persona: { documentNumber: "2" }, result: OK_RUN },
        {
          index: 2,
          persona: { documentNumber: "3" },
          result: { ...OK_RUN, passedSteps: 0, failedSteps: 1 },
        },
      ],
    });
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(previewButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(await screen.findByText("2/3 personas OK")).toBeInTheDocument();
    expect(screen.getByText("Persona 1")).toBeInTheDocument();
    expect(screen.getByText("Persona 3")).toBeInTheDocument();
    // Sin expandir, el detalle de cada persona (los pasos, el contexto) no está en el DOM.
    expect(
      screen.queryByText("Contexto final del journey"),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Persona 1").closest("button")!);

    expect(screen.getByText("Contexto final del journey")).toBeInTheDocument();
  });
});
