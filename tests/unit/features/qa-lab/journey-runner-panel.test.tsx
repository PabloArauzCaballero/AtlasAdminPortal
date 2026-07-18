import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import type { QaJourneyRunResult } from "@/features/qa-lab/journey-types";
import { endpointFixture } from "./endpoint-fixture";

vi.setConfig({ testTimeout: 30000 });

const useEndpointsByIds = vi.hoisted(() => vi.fn());
const runJourney = vi.hoisted(() => vi.fn());

vi.mock("@/features/systems/hooks", () => ({ useEndpointsByIds }));
vi.mock("@/features/qa-lab/journey-runner", () => ({ runJourney }));
vi.mock("@/features/qa-lab/journey-step-endpoint-select", () => ({
  JourneyStepEndpointSelect: () => null,
}));

const { JourneyRunnerPanel } =
  await import("@/features/qa-lab/journey-runner-panel");

const OK_RESULT: QaJourneyRunResult = {
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

beforeEach(() => {
  runJourney.mockReset();
  runJourney.mockResolvedValue(OK_RESULT);
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

function runButton() {
  return screen.getByRole("button", { name: /journey/ });
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

  it("arranca en dry-run", () => {
    render_();

    expect(
      screen.getByRole("checkbox", { name: "Dry-run / modo seguro" }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Previsualizar journey" }),
    ).toBeInTheDocument();
  });
});

describe("JourneyRunnerPanel · pasos inválidos", () => {
  it("con un JSON roto no se puede ejecutar", async () => {
    render_();

    await writeSteps("no soy json");

    expect(runButton()).toBeDisabled();
  });

  it("un array vacío tampoco es ejecutable", async () => {
    render_();

    await writeSteps("[]");

    expect(runButton()).toBeDisabled();
  });

  it("un paso sin endpointId se rechaza señalando cuál", async () => {
    // Ejecutar un paso sin endpoint solo produce un error opaco a mitad del
    // journey, cuando los pasos previos ya escribieron.
    render_();

    await writeSteps('[{"key":"a"}]');

    expect(runButton()).toBeDisabled();
  });

  it("una secuencia válida sí es ejecutable", async () => {
    render_();

    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');

    expect(runButton()).toBeEnabled();
  });
});

describe("JourneyRunnerPanel · ejecución", () => {
  it("ejecutar pide confirmación y dice cuántos pasos y dónde", async () => {
    render_();
    await writeSteps(
      '[{"key":"a","endpointId":"ep-1"},{"key":"b","endpointId":"ep-1"}]',
    );

    await userEvent.click(runButton());

    expect(
      within(screen.getByRole("dialog")).getByText(
        "Se previsualizarán 2 pasos encadenados en LOCAL.",
      ),
    ).toBeInTheDocument();
    expect(runJourney).not.toHaveBeenCalled();
  });

  it("confirmar corre el journey con los pasos, la config y el catálogo", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(runButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    await waitFor(() => expect(runJourney).toHaveBeenCalledTimes(1));
    expect(runJourney.mock.calls[0][0]).toEqual([
      { key: "a", endpointId: "ep-1" },
    ]);
    expect(runJourney.mock.calls[0][1]).toMatchObject({
      dryRun: true,
      environment: "LOCAL",
    });
    expect(runJourney.mock.calls[0][2]).toEqual({ "ep-1": endpointFixture() });
  });

  it("un journey real fuera de LOCAL exige teclear EJECUTAR", async () => {
    // Encadena escrituras reales: es el freno más importante del panel.
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Dry-run / modo seguro" }),
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Ambiente" }),
      "STAGING",
    );

    await userEvent.click(runButton());

    expect(screen.getByRole("button", { name: "Ejecutar" })).toBeDisabled();
    expect(runJourney).not.toHaveBeenCalled();
  });

  it("un journey real en LOCAL no exige la frase", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Dry-run / modo seguro" }),
    );

    await userEvent.click(runButton());

    expect(screen.getByRole("button", { name: "Ejecutar" })).toBeEnabled();
  });

  it("cancelar no corre nada", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(runButton());

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(runJourney).not.toHaveBeenCalled();
  });

  it("mientras se resuelve el catálogo el botón queda ocupado", () => {
    // Correr sin las definiciones dejaría todos los pasos omitidos.
    useEndpointsByIds.mockReturnValue({ isLoading: true, byId: {} });
    render_();

    expect(
      screen.getByRole("button", { name: /Ejecutando journey/ }),
    ).toBeDisabled();
  });
});

describe("JourneyRunnerPanel · resultado y errores", () => {
  it("el resultado del journey se muestra al terminar", async () => {
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(runButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(await screen.findByText("1/1 pasos OK")).toBeInTheDocument();
    expect(screen.getByText("Contexto final del journey")).toBeInTheDocument();
  });

  it("un journey con pasos fallidos se ve como tal, no como uno vacío", async () => {
    runJourney.mockResolvedValue({
      ...OK_RESULT,
      passedSteps: 0,
      failedSteps: 1,
      steps: [
        {
          ...OK_RESULT.steps[0],
          passed: false,
          ok: false,
          httpStatus: 500,
          error: "HTTP 500 fuera de los esperados",
        },
      ],
    });
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(runButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(await screen.findByText("WARNING")).toBeInTheDocument();
    expect(
      screen.getByText("HTTP 500 fuera de los esperados"),
    ).toBeInTheDocument();
  });

  it("un fallo del runner se lee en vez de perderse", async () => {
    runJourney.mockRejectedValue(new Error("Host no permitido para QA."));
    render_();
    await writeSteps('[{"key":"a","endpointId":"ep-1"}]');
    await userEvent.click(runButton());

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
});
