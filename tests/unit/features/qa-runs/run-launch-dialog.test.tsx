import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import {
  blockedPreflight,
  capabilitiesFixture,
  readyPreflight,
  templateFixture,
} from "./qa-runs-fixtures";

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  getQaCapabilities: vi.fn(),
  listQaTemplates: vi.fn(),
  preflightQaRun: vi.fn(),
  launchQaRun: vi.fn(),
}));
vi.mock("@/features/qa-runs/run-api", () => api);

const { RunLaunchDialog } =
  await import("@/features/qa-runs/run-launch-dialog");

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getQaCapabilities.mockResolvedValue(capabilitiesFixture());
  api.listQaTemplates.mockResolvedValue([templateFixture()]);
  api.preflightQaRun.mockResolvedValue(readyPreflight());
  api.launchQaRun.mockResolvedValue({ runId: "run-9", status: "QUEUED" });
});

function render_(onLaunched = vi.fn()) {
  renderWithProviders(
    <RunLaunchDialog
      open
      workflowCode="customer_full_lifecycle"
      onClose={vi.fn()}
      onLaunched={onLaunched}
    />,
  );
  return { onLaunched };
}

function executeButton() {
  return screen.getByRole("button", { name: /^Ejecutar \d+ personas/ });
}

async function validate() {
  await userEvent.click(
    screen.getByRole("button", { name: /Validar preparación/ }),
  );
}

describe("RunLaunchDialog · UI/contrato con respuestas simuladas del contrato QA", () => {
  it("pide las plantillas del flujo del árbol, no todas", async () => {
    render_();
    await screen.findByRole("spinbutton", { name: /^Personas/ });
    expect(api.listQaTemplates).toHaveBeenCalledWith("customer_full_lifecycle");
  });

  it("no permite ejecutar sin una preparación READY", async () => {
    render_();
    await screen.findByRole("spinbutton", { name: /^Personas/ });

    expect(executeButton()).toBeDisabled();
    expect(api.launchQaRun).not.toHaveBeenCalled();
  });

  it("enseña cada bloqueo con su mensaje y deja Ejecutar deshabilitado", async () => {
    api.preflightQaRun.mockResolvedValue(blockedPreflight());
    render_();
    await screen.findByRole("spinbutton", { name: /^Personas/ });
    await validate();

    const list = await screen.findByRole("list", {
      name: "Motivos del bloqueo",
    });
    expect(
      within(list).getByText(/El worker de QA no envió latido/),
    ).toBeInTheDocument();
    expect(
      within(list).getByText(/No hay usuario interno de QA/),
    ).toBeInTheDocument();
    expect(within(list).getByText(/review_decision/)).toBeInTheDocument();
    expect(executeButton()).toBeDisabled();
  });

  it("personas y concurrencia son dos campos y viajan por separado", async () => {
    render_();
    const persons = await screen.findByRole("spinbutton", {
      name: /^Personas/,
    });
    const concurrency = screen.getByRole("spinbutton", {
      name: /^Concurrencia/,
    });
    expect(persons).not.toBe(concurrency);

    await userEvent.clear(persons);
    await userEvent.type(persons, "20");
    await userEvent.clear(concurrency);
    await userEvent.type(concurrency, "5");
    await validate();

    await waitFor(() => expect(api.preflightQaRun).toHaveBeenCalledTimes(1));
    expect(api.preflightQaRun.mock.calls[0][0]).toMatchObject({
      templateCode: "account_signup_to_login",
      templateVersion: "1.0.0",
      environmentId: "qa-isolated",
      mode: "INTEGRATED_QA",
      persons: 20,
      concurrency: 5,
      datasetMode: "NORMAL_SYNTHETIC",
      scenarioCode: "happy_path",
      seed: "atlas-qa-regression-v1",
    });
  });

  it("con READY lanza el plan validado y avisa el runId", async () => {
    const { onLaunched } = render_();
    await screen.findByRole("spinbutton", { name: /^Personas/ });
    await validate();
    await screen.findByText("Preparación lista");

    expect(executeButton()).toBeEnabled();
    expect(executeButton()).toHaveTextContent("20 personas en QA aislado");
    await userEvent.click(executeButton());

    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith("run-9"));
    expect(api.launchQaRun).toHaveBeenCalledWith(
      { planId: "12", planHash: "hash-12" },
      expect.any(String),
    );
  });

  it("cambiar un campo tras validar descarta la validación", async () => {
    render_();
    const persons = await screen.findByRole("spinbutton", {
      name: /^Personas/,
    });
    await validate();
    await screen.findByText("Preparación lista");

    await userEvent.type(persons, "1");

    expect(screen.queryByText("Preparación lista")).not.toBeInTheDocument();
    expect(executeButton()).toBeDisabled();
  });

  it("reintentar el MISMO lanzamiento reenvía la misma clave de idempotencia", async () => {
    api.launchQaRun
      .mockRejectedValueOnce(new Error("Se cortó la conexión"))
      .mockResolvedValueOnce({ runId: "run-9", status: "QUEUED" });
    const { onLaunched } = render_();
    await screen.findByRole("spinbutton", { name: /^Personas/ });
    await validate();
    await screen.findByText("Preparación lista");

    await userEvent.click(executeButton());
    expect(await screen.findByText("Se cortó la conexión")).toBeInTheDocument();
    await userEvent.click(executeButton());

    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith("run-9"));
    expect(api.launchQaRun).toHaveBeenCalledTimes(2);
    const [first, second] = api.launchQaRun.mock.calls.map((call) => call[1]);
    expect(first).toEqual(second);
    expect(String(first).length).toBeGreaterThanOrEqual(8);
  });

  it("un plan nuevo es otro intento y lleva otra clave", async () => {
    api.launchQaRun.mockRejectedValue(new Error("Se cortó la conexión"));
    api.preflightQaRun
      .mockResolvedValueOnce(readyPreflight({ planId: "12" }))
      .mockResolvedValueOnce(readyPreflight({ planId: "13", planHash: "h13" }));
    render_();
    const persons = await screen.findByRole("spinbutton", {
      name: /^Personas/,
    });
    await validate();
    await screen.findByText("Preparación lista");
    await userEvent.click(executeButton());
    await screen.findByText("Se cortó la conexión");

    await userEvent.clear(persons);
    await userEvent.type(persons, "30");
    await validate();
    await screen.findByText("Preparación lista");
    await userEvent.click(executeButton());

    await waitFor(() => expect(api.launchQaRun).toHaveBeenCalledTimes(2));
    const [first, second] = api.launchQaRun.mock.calls.map((call) => call[1]);
    expect(first).not.toEqual(second);
  });

  it("con las corridas desactivadas enseña el motivo y no ofrece ejecutar", async () => {
    api.getQaCapabilities.mockResolvedValue(
      capabilitiesFixture({ enabled: false, deploymentEnvironment: "PROD" }),
    );
    render_();

    expect(
      await screen.findByText(
        /Las corridas de QA están desactivadas en este entorno \(PROD\)/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Ejecutar \d+ personas/ }),
    ).not.toBeInTheDocument();
  });

  it("no pide URL, token, IDs de endpoint ni JSON", async () => {
    render_();
    await screen.findByRole("spinbutton", { name: /^Personas/ });
    const dialog = screen.getByRole("dialog");

    expect(
      within(dialog).queryByText(/bearer|token|endpointId|url/i),
    ).toBeNull();
    expect(dialog.querySelector("textarea")).toBeNull();
  });
});
