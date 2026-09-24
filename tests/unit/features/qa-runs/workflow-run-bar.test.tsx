import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import realTree from "../workflows/fixtures/customer-credit-journey.json";
import type { WorkflowTree } from "@/features/workflows/types";
import {
  capabilitiesFixture,
  runFixture,
  templateFixture,
} from "./qa-runs-fixtures";

vi.setConfig({ testTimeout: 30000 });

const REAL_TREE = realTree as unknown as WorkflowTree;
const STEP = "ops.credit_products_list";

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
  preflightQaRun: vi.fn(),
  launchQaRun: vi.fn(),
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
});

function runOnTree(passed: number, failed: number) {
  return runFixture({
    runId: "run-7",
    workflowCode: REAL_TREE.workflowCode,
    steps: [
      {
        stepKey: "list",
        workflowStepCode: STEP,
        passed,
        failed,
        skipped: 0,
        notApplicable: 0,
        indeterminate: 0,
        cancelled: 0,
      },
    ],
  });
}

describe("árbol · ejecutar el flujo con N personas (UI/contrato con respuestas simuladas)", () => {
  it("sin controles de corrida el árbol no ofrece ejecutar (compatibilidad)", async () => {
    renderWithProviders(<WorkflowCanvas />);
    await screen.findByText("etapas");
    expect(
      screen.queryByRole("button", { name: /Ejecutar flujo con N personas/ }),
    ).not.toBeInTheDocument();
  });

  it("el botón abre el lanzamiento filtrado por el flujo seleccionado", async () => {
    renderWithProviders(
      <WorkflowCanvas runControls={{ runId: null, onRunIdChange: vi.fn() }} />,
    );
    await userEvent.click(
      await screen.findByRole("button", {
        name: /Ejecutar flujo con N personas/,
      }),
    );

    expect(
      await within(screen.getByRole("dialog")).findByRole("spinbutton", {
        name: /^Personas/,
      }),
    ).toBeInTheDocument();
    expect(api.listQaTemplates).toHaveBeenCalledWith(REAL_TREE.workflowCode);
  });

  it("cada nodo pinta la distribución de todas las personas, no un verde por una", async () => {
    api.getQaRun.mockResolvedValue(runOnTree(1, 99));
    renderWithProviders(
      <WorkflowCanvas
        runControls={{ runId: "run-7", onRunIdChange: vi.fn() }}
      />,
    );

    const overlay = await screen.findByTestId(`run-counts-${STEP}`);
    expect(overlay).toHaveTextContent("✓ 1 · ✗ 99 · otros 0");
    expect(overlay.querySelector("rect")?.getAttribute("fill")).not.toBe(
      "#dcfce7",
    );
  });

  it("una corrida de otro flujo no se pinta sobre éste", async () => {
    api.getQaRun.mockResolvedValue({
      ...runOnTree(5, 0),
      workflowCode: "otro_flujo",
    });
    renderWithProviders(
      <WorkflowCanvas
        runControls={{ runId: "run-7", onRunIdChange: vi.fn() }}
      />,
    );

    expect(
      await screen.findByText(/La corrida abierta es de otro flujo/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId(`run-counts-${STEP}`)).not.toBeInTheDocument();
  });

  it("«Último resultado» abre la corrida más reciente de este flujo", async () => {
    api.listQaRuns.mockResolvedValue([
      { ...runOnTree(1, 0), runId: "run-otro", workflowCode: "otro_flujo" },
      runOnTree(1, 0),
    ]);
    const onRunIdChange = vi.fn();
    renderWithProviders(
      <WorkflowCanvas runControls={{ runId: null, onRunIdChange }} />,
    );

    const button = await screen.findByRole("button", {
      name: /Último resultado/,
    });
    await vi.waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    expect(onRunIdChange).toHaveBeenCalledWith("run-7");
  });
});
