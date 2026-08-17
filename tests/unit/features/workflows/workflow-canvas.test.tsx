import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import realTree from "./fixtures/customer-credit-journey.json";
import type { WorkflowTree } from "@/features/workflows/types";

vi.setConfig({ testTimeout: 30000 });

const listWorkflows = vi.hoisted(() => vi.fn());
const getWorkflowTree = vi.hoisted(() => vi.fn());
const getWorkflowVersions = vi.hoisted(() => vi.fn());
const getWorkflowGraph = vi.hoisted(() => vi.fn());
const validateWorkflowTransition = vi.hoisted(() => vi.fn());

// Parcial: la ficha del paso usa además los ayudantes de ruta del módulo, y
// un mock total los borraría.
vi.mock("@/features/workflows/services", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listWorkflows,
  getWorkflowTree,
  getWorkflowVersions,
  getWorkflowGraph,
  validateWorkflowTransition,
}));

const { WorkflowCanvas } = await import("@/features/workflows/workflow-canvas");

/**
 * Respuesta REAL del backend (`GET /workflows/customer_credit_journey`),
 * capturada contra el catálogo sembrado. Probar contra el árbol de verdad —22
 * etapas, 57 pasos, 33 transiciones— es lo que valida que la vista aguanta la
 * forma del flujo publicado y no sólo un ejemplo de tres cajas.
 */
const REAL_TREE = realTree as unknown as WorkflowTree;

beforeEach(() => {
  listWorkflows.mockReset();
  getWorkflowTree.mockReset();
  getWorkflowVersions.mockReset();
  listWorkflows.mockResolvedValue([
    {
      workflowCode: REAL_TREE.workflowCode,
      name: REAL_TREE.name,
      version: "v1",
      status: "active",
      isDefault: true,
    },
  ]);
  getWorkflowVersions.mockResolvedValue([
    {
      workflowCode: REAL_TREE.workflowCode,
      version: "v1",
      status: "active",
      isDefault: true,
    },
  ]);
  getWorkflowTree.mockResolvedValue(REAL_TREE);
});

describe("WorkflowCanvas · lectura del catálogo", () => {
  it("pide el flujo estándar al backend, no lo deriva del portal", async () => {
    renderWithProviders(<WorkflowCanvas />);

    expect(await screen.findByText("etapas")).toBeInTheDocument();
    expect(getWorkflowTree).toHaveBeenCalledWith("customer_credit_journey", {
      version: "latest",
    });
  });

  it("muestra los totales que declara el backend", async () => {
    renderWithProviders(<WorkflowCanvas />);

    const stages = await screen.findByText("etapas");
    expect(stages.parentElement).toHaveTextContent("22");
    expect(
      screen.getByText("pasos (endpoints)").parentElement,
    ).toHaveTextContent("57");
    expect(screen.getByText("transiciones").parentElement).toHaveTextContent(
      "33",
    );
  });

  it("dibuja las etapas y los endpoints reales del recorrido", async () => {
    renderWithProviders(<WorkflowCanvas />);

    expect(
      await screen.findByRole("button", { name: /Etapa Registro y acceso/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Paso POST \/customer-onboarding\/start/,
      }),
    ).toBeInTheDocument();
  });

  it("al elegir un paso, su ficha explica lo que declara el catálogo", async () => {
    renderWithProviders(<WorkflowCanvas />);
    const stepNode = await screen.findByRole("button", {
      name: /Paso POST \/customer-onboarding\/start/,
    });

    await userEvent.click(stepNode);

    expect(screen.getByText("Paso del flujo")).toBeInTheDocument();
    expect(screen.getByText("entrada del flujo")).toBeInTheDocument();
  });

  it("el filtro por módulo se manda al backend, no se recorta en el navegador", async () => {
    // Recortar aquí dejaría transiciones apuntando a pasos que ya no están.
    renderWithProviders(<WorkflowCanvas />);
    await screen.findByText("etapas");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Módulo" }),
      "risk",
    );

    expect(getWorkflowTree).toHaveBeenLastCalledWith(
      "customer_credit_journey",
      {
        version: "latest",
        moduleCode: "risk",
      },
    );
  });
});

describe("WorkflowCanvas · estados", () => {
  it("si el backend no publica el catálogo, lo dice sin dejar la pantalla en blanco", async () => {
    getWorkflowTree.mockRejectedValue(
      new Error("Cannot GET /api/v1/workflows"),
    );
    renderWithProviders(<WorkflowCanvas />);

    expect(
      await screen.findByText("No se pudo leer el catálogo de flujos"),
    ).toBeInTheDocument();
  });

  it("un filtro que deja el flujo vacío se explica en vez de mostrar un lienzo mudo", async () => {
    getWorkflowTree.mockResolvedValue({ ...REAL_TREE, stages: [] });
    renderWithProviders(<WorkflowCanvas />);

    expect(
      await screen.findByText("El filtro dejó el flujo vacío"),
    ).toBeInTheDocument();
  });
});
