import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import realTree from "../workflows/fixtures/customer-credit-journey.json";
import type { WorkflowTree } from "@/features/workflows/types";
import { toPoints } from "@/features/qa-runs/workflow-load-bar";
import {
  capabilitiesFixture,
  readyPreflight,
  runFixture,
  templateFixture,
} from "./qa-runs-fixtures";

vi.setConfig({ testTimeout: 30000 });

const REAL_TREE = realTree as unknown as WorkflowTree;
const STEP = "ops.credit_products_list";
const PARAM_STEP = "ops.credit_product_status";

const workflows = vi.hoisted(() => ({
  listWorkflows: vi.fn(),
  getWorkflowTree: vi.fn(),
  getWorkflowVersions: vi.fn(),
  getWorkflowGraph: vi.fn(),
  validateWorkflowTransition: vi.fn(),
}));
vi.mock("@/features/workflows/services", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...workflows,
}));

const api = vi.hoisted(() => ({
  getQaCapabilities: vi.fn(),
  listQaTemplates: vi.fn(),
  listQaRuns: vi.fn(),
  getQaRun: vi.fn(),
  getQaRunTimeline: vi.fn(),
  preflightQaRun: vi.fn(),
  launchQaRun: vi.fn(),
  cancelQaRun: vi.fn(),
}));
vi.mock("@/features/qa-runs/run-api", () => api);

const { WorkflowCanvas } = await import("@/features/workflows/workflow-canvas");

beforeEach(() => {
  Object.values(workflows).forEach((fn) => fn.mockReset());
  Object.values(api).forEach((fn) => fn.mockReset());
  workflows.listWorkflows.mockResolvedValue([
    {
      workflowCode: REAL_TREE.workflowCode,
      name: REAL_TREE.name,
      version: "v1",
      status: "active",
      isDefault: true,
    },
  ]);
  workflows.getWorkflowVersions.mockResolvedValue([]);
  workflows.getWorkflowTree.mockResolvedValue(REAL_TREE);
  api.getQaCapabilities.mockResolvedValue(capabilitiesFixture());
  api.listQaTemplates.mockResolvedValue([
    templateFixture({ workflowCode: REAL_TREE.workflowCode }),
  ]);
  api.listQaRuns.mockResolvedValue([]);
  api.getQaRunTimeline.mockResolvedValue({
    runId: "run-7",
    bucketSeconds: 5,
    startedAt: "2026-09-26T12:00:00.000Z",
    buckets: [],
    totals: { requests: 0, errors: 0, p50Ms: null, p95Ms: null, rps: null },
  });
});

const counts = (
  stepKey: string,
  endpoint: string,
  passed: number,
  failed: number,
) => ({
  stepKey,
  // Códigos de paso de la RECETA, distintos de los del flujo: el nodo se casa por endpoint.
  workflowStepCode: `receta.${stepKey}`,
  endpoint,
  passed,
  failed,
  skipped: 0,
  notApplicable: 0,
  indeterminate: 0,
  cancelled: 0,
});

function runOnTree(passed: number, failed: number, status = "RUNNING") {
  return runFixture({
    runId: "run-7",
    status: status as never,
    workflowCode: REAL_TREE.workflowCode,
    steps: [
      counts("list", "GET /operations/credit/products", passed, failed),
      counts(
        "status_a",
        "PATCH /operations/credit/products/:param/status",
        2,
        0,
      ),
      counts(
        "status_b",
        "PATCH /operations/credit/products/:param/status",
        1,
        1,
      ),
    ],
  });
}

function renderTree(runId: string | null = null, onRunIdChange = vi.fn()) {
  renderWithProviders(
    <WorkflowCanvas runControls={{ runId, onRunIdChange }} />,
  );
  return onRunIdChange;
}

describe("árbol · prueba de carga con usuarios ficticios", () => {
  it("sin controles de corrida el árbol no ofrece la prueba (compatibilidad)", async () => {
    renderWithProviders(<WorkflowCanvas />);
    await screen.findByText("etapas");
    expect(
      screen.queryByRole("button", { name: /Generar y cargar/ }),
    ).not.toBeInTheDocument();
  });

  it("sólo hay tres controles: usuarios, generar y terminar", async () => {
    renderTree();
    const bar = await screen.findByRole("region", {
      name: /Prueba de carga con usuarios ficticios/,
    });
    expect(
      within(bar).getByRole("spinbutton", { name: /Usuarios ficticios/ }),
    ).toHaveValue(10);
    expect(
      within(bar).getByRole("button", { name: /Generar y cargar/ }),
    ).toBeInTheDocument();
    expect(
      within(bar).getByRole("button", { name: /Terminar prueba/ }),
    ).toBeDisabled();
    expect(within(bar).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("«Generar y cargar» valida y lanza con los usuarios pedidos, sin diálogo", async () => {
    api.preflightQaRun.mockResolvedValue(readyPreflight());
    api.launchQaRun.mockResolvedValue({ runId: "run-9", status: "QUEUED" });
    const onRunIdChange = renderTree();

    const input = await screen.findByRole("spinbutton", {
      name: /Usuarios ficticios/,
    });
    await userEvent.clear(input);
    await userEvent.type(input, "25");
    const button = screen.getByRole("button", { name: /Generar y cargar/ });
    await vi.waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    await vi.waitFor(() => expect(onRunIdChange).toHaveBeenCalledWith("run-9"));
    const request = api.preflightQaRun.mock.calls[0][0];
    expect(request).toMatchObject({
      workflowCode: REAL_TREE.workflowCode,
      templateCode: "account_signup_to_login",
      environmentId: "qa-isolated",
      persons: 25,
      concurrency: 10,
      datasetMode: "NORMAL_SYNTHETIC",
      scenarioCode: "happy_path",
    });
    expect(request.seed).toMatch(/^carga-/);
    expect(api.launchQaRun).toHaveBeenCalledWith(
      { planId: "12", planHash: expect.any(String) },
      expect.any(String),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("si el servidor bloquea la preparación, dice por qué y no lanza", async () => {
    api.preflightQaRun.mockResolvedValue(
      readyPreflight({
        status: "BLOCKED",
        planId: null,
        planHash: null,
        blockers: [
          { code: "MOCK_UNAVAILABLE", message: "El mock no responde." },
        ],
      }),
    );
    renderTree();
    const button = await screen.findByRole("button", {
      name: /Generar y cargar/,
    });
    await vi.waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El mock no responde.",
    );
    expect(api.launchQaRun).not.toHaveBeenCalled();
  });

  it("con las pruebas apagadas en el entorno lo dice sin llamar al servidor", async () => {
    api.getQaCapabilities.mockResolvedValue(
      capabilitiesFixture({ enabled: false, disabledReason: "sin mock" }),
    );
    renderTree();
    const button = await screen.findByRole("button", {
      name: /Generar y cargar/,
    });
    await vi.waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent("sin mock");
    expect(api.preflightQaRun).not.toHaveBeenCalled();
  });

  it("«Terminar prueba» cancela la corrida en curso", async () => {
    api.getQaRun.mockResolvedValue(runOnTree(1, 0));
    api.cancelQaRun.mockResolvedValue({ runId: "run-7", status: "CANCELLING" });
    renderTree("run-7");

    const stop = await screen.findByRole("button", { name: /Terminar prueba/ });
    await vi.waitFor(() => expect(stop).toBeEnabled());
    expect(
      screen.getByRole("button", { name: /Generar y cargar/ }),
    ).toBeDisabled();
    await userEvent.click(stop);

    await vi.waitFor(() =>
      expect(api.cancelQaRun).toHaveBeenCalledWith("run-7"),
    );
  });

  it("al volver abre la última prueba de este flujo", async () => {
    api.listQaRuns.mockResolvedValue([
      { ...runOnTree(1, 0), runId: "run-otro", workflowCode: "otro_flujo" },
      runOnTree(1, 0),
    ]);
    const onRunIdChange = renderTree();
    await vi.waitFor(() => expect(onRunIdChange).toHaveBeenCalledWith("run-7"));
  });

  it("cada nodo pinta la distribución de todos los usuarios, no un verde por uno", async () => {
    api.getQaRun.mockResolvedValue(runOnTree(1, 99, "COMPLETED"));
    renderTree("run-7");

    const overlay = await screen.findByTestId(`run-counts-${STEP}`);
    expect(overlay).toHaveTextContent("✓ 1 · ✗ 99 · otros 0");
    expect(overlay.querySelector("rect")?.getAttribute("fill")).not.toBe(
      "#dcfce7",
    );
  });

  it("casa por endpoint normalizando :productId → :param y suma los pasos del mismo nodo", async () => {
    api.getQaRun.mockResolvedValue(runOnTree(1, 0, "COMPLETED"));
    renderTree("run-7");

    const overlay = await screen.findByTestId(`run-counts-${PARAM_STEP}`);
    expect(overlay).toHaveTextContent("✓ 3 · ✗ 1 · otros 0");
  });

  it("una corrida de otro flujo no se pinta sobre éste", async () => {
    api.getQaRun.mockResolvedValue({
      ...runOnTree(5, 0),
      workflowCode: "otro_flujo",
    });
    renderTree("run-7");
    await screen.findByText("etapas");
    expect(screen.queryByTestId(`run-counts-${STEP}`)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Terminar prueba/ }),
    ).toBeDisabled();
  });

  it("el gráfico recibe la latencia y la carga de cada tramo", async () => {
    api.getQaRun.mockResolvedValue(runOnTree(3, 0, "COMPLETED"));
    api.getQaRunTimeline.mockResolvedValue({
      runId: "run-7",
      bucketSeconds: 5,
      startedAt: "2026-09-26T12:00:00.000Z",
      buckets: [
        {
          t: "2026-09-26T12:00:05.000Z",
          requests: 12,
          errors: 1,
          p50Ms: 80,
          p95Ms: 240,
          maxMs: 400,
          personasActive: 10,
        },
      ],
      totals: { requests: 12, errors: 1, p50Ms: 80, p95Ms: 240, rps: 2.4 },
    });
    renderTree("run-7");

    expect(
      await screen.findByText(/12 peticiones · 1 con error · p95 240 ms/),
    ).toBeInTheDocument();
  });
});

describe("toPoints", () => {
  it("convierte los tramos en segundos desde el inicio", () => {
    expect(
      toPoints({
        runId: "r",
        bucketSeconds: 5,
        startedAt: "2026-09-26T12:00:00.000Z",
        buckets: [
          {
            t: "2026-09-26T12:00:10.000Z",
            requests: 4,
            errors: 0,
            p50Ms: 50,
            p95Ms: null,
            maxMs: 90,
            personasActive: 2,
          },
        ],
        totals: { requests: 4, errors: 0, p50Ms: 50, p95Ms: null, rps: 0.4 },
      }),
    ).toEqual([
      {
        second: 10,
        count: 4,
        errorCount: 0,
        avgLatencyMs: 50,
        p50LatencyMs: 50,
        p95LatencyMs: 0,
        maxLatencyMs: 90,
      },
    ]);
  });
});
