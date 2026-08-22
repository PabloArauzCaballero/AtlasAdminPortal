import { describe, expect, it } from "vitest";
import {
  NODE_W,
  layoutWorkflowGraph,
} from "@/features/workflows/workflow-graph-layout";
import {
  INITIAL_VIEWPORT,
  MAX_SCALE,
  MIN_SCALE,
  fitToView,
  zoomAt,
} from "@/features/workflows/workflow-viewport";
import type {
  WorkflowStage,
  WorkflowStep,
  WorkflowTransition,
} from "@/features/workflows/types";

function step(
  stepCode: string,
  overrides: Partial<WorkflowStep> = {},
): WorkflowStep {
  return {
    stepId: stepCode,
    stepCode,
    name: stepCode,
    description: null,
    endpointCode: `CODE_${stepCode}`,
    httpMethod: "POST",
    routePath: `/${stepCode}`,
    executionOrder: 10,
    isMandatory: true,
    isRepeatable: false,
    requiresAuth: true,
    requiresIdempotencyKey: false,
    isFlowEntry: false,
    isFlowExit: false,
    allowedRoles: [],
    requiredStates: [],
    resultingStates: [],
    inputContract: {},
    outputContract: {},
    validationRules: [],
    possibleErrors: [],
    retryStrategy: {},
    producesEvents: [],
    consumesEvents: [],
    successCriteria: {},
    failureCriteria: {},
    dependsOn: [],
    previousStepCodes: [],
    nextStepCodes: [],
    ...overrides,
  };
}

function stage(
  stageCode: string,
  steps: WorkflowStep[],
  subStages: WorkflowStage[] = [],
): WorkflowStage {
  return {
    stageId: stageCode,
    stageCode,
    parentStageCode: null,
    name: stageCode,
    description: null,
    moduleCode: "customer_onboarding",
    actorType: "customer",
    displayOrder: 10,
    isOptional: false,
    isEntryStage: false,
    isTerminalStage: false,
    allowedRoles: [],
    requiredStates: [],
    resultingStates: [],
    completionRule: {},
    steps,
    subStages,
  };
}

function transition(
  from: string | null,
  to: string | null,
  overrides: Partial<WorkflowTransition> = {},
): WorkflowTransition {
  return {
    transitionId: `${from}->${to}`,
    transitionCode: `${from ?? "entry"}->${to ?? "exit"}`,
    fromStepCode: from,
    toStepCode: to,
    conditionType: "on_success",
    conditionExpression: {},
    description: null,
    displayOrder: 10,
    isDefaultPath: true,
    ...overrides,
  };
}

describe("layoutWorkflowGraph · nodos reales en 2D", () => {
  it("da un nodo por endpoint, no una fila de lista", () => {
    const layout = layoutWorkflowGraph(
      [stage("registro", [step("a"), step("b")])],
      [],
    );

    expect(layout.nodes.map((node) => node.id)).toEqual(["a", "b"]);
    expect(layout.nodes[0].width).toBe(NODE_W);
    // Mismo carril: comparten columna y se apilan.
    expect(layout.nodes[0].x).toBe(layout.nodes[1].x);
    expect(layout.nodes[1].y).toBeGreaterThan(layout.nodes[0].y);
  });

  it("cada etapa ocupa su propia columna, en orden de ejecución", () => {
    const layout = layoutWorkflowGraph(
      [stage("uno", [step("a")]), stage("dos", [step("b")])],
      [],
    );

    const [a, b] = layout.nodes;
    expect(b.x).toBeGreaterThan(a.x);
  });

  it("una subetapa abre columna propia y su madre abarca hasta ella", () => {
    const layout = layoutWorkflowGraph(
      [stage("madre", [step("a")], [stage("hija", [step("b")])])],
      [],
    );

    const madre = layout.lanes.find((lane) => lane.stage.stageCode === "madre");
    const hija = layout.lanes.find((lane) => lane.stage.stageCode === "hija");
    expect(hija!.column).toBe(madre!.column + 1);
    expect(madre!.lastColumn).toBe(hija!.column);
    expect(hija!.depth).toBe(1);
  });

  it("une los nodos con la transición declarada", () => {
    const layout = layoutWorkflowGraph(
      [stage("uno", [step("a")]), stage("dos", [step("b")])],
      [transition("a", "b")],
    );

    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0]).toMatchObject({
      from: "a",
      to: "b",
      isBackward: false,
    });
    expect(layout.edges[0].path.startsWith("M ")).toBe(true);
  });

  it("una vuelta atrás se marca para rodear en vez de cruzar el camino de ida", () => {
    const layout = layoutWorkflowGraph(
      [stage("uno", [step("a")]), stage("dos", [step("b")])],
      [transition("b", "a", { conditionType: "on_error" })],
    );

    expect(layout.edges[0].isBackward).toBe(true);
  });

  it("entrada y salida se dibujan como terminales, no como flechas sueltas", () => {
    const layout = layoutWorkflowGraph(
      [stage("uno", [step("a")])],
      [transition(null, "a"), transition("a", null)],
    );

    expect(layout.terminals.map((terminal) => terminal.kind)).toEqual([
      "entry",
      "exit",
    ]);
    expect(layout.edges).toEqual([]);
  });

  it("ignora una transición cuyo paso no está en el árbol filtrado", () => {
    const layout = layoutWorkflowGraph(
      [stage("uno", [step("a")])],
      [transition("a", "fantasma")],
    );

    expect(layout.edges).toEqual([]);
  });
});

describe("viewport · navegar sin editar", () => {
  it("el zoom con rueda deja quieto el punto bajo el cursor", () => {
    const point = { x: 300, y: 200 };
    const zoomed = zoomAt(INITIAL_VIEWPORT, 2, point);

    // Coordenada de contenido bajo el cursor antes y después: la misma.
    const before = (point.x - INITIAL_VIEWPORT.x) / INITIAL_VIEWPORT.scale;
    const after = (point.x - zoomed.x) / zoomed.scale;
    expect(after).toBeCloseTo(before, 5);
  });

  it("la escala no se sale de sus topes por mucho que se insista", () => {
    let viewport = INITIAL_VIEWPORT;
    for (let i = 0; i < 40; i += 1)
      viewport = zoomAt(viewport, 1.5, { x: 0, y: 0 });
    expect(viewport.scale).toBe(MAX_SCALE);

    for (let i = 0; i < 60; i += 1)
      viewport = zoomAt(viewport, 0.7, { x: 0, y: 0 });
    expect(viewport.scale).toBe(MIN_SCALE);
  });

  it("ajustar encaja un grafo ancho dentro del área visible", () => {
    const viewport = fitToView(
      { width: 4000, height: 900 },
      { width: 1000, height: 600 },
    );

    expect(viewport.scale).toBeLessThan(1);
    expect(4000 * viewport.scale).toBeLessThanOrEqual(1000);
  });

  it("un contenido vacío no produce una escala infinita", () => {
    expect(
      fitToView({ width: 0, height: 0 }, { width: 800, height: 600 }),
    ).toEqual(INITIAL_VIEWPORT);
  });
});
