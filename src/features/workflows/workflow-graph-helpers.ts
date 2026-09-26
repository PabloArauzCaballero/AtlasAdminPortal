import type { WorkflowGraphLayout } from "./workflow-graph-layout";
import type { WorkflowStage, WorkflowStep, WorkflowTree } from "./types";

/**
 * Consultas sobre el árbol del flujo que el lienzo necesita para dibujar:
 * quién ejecuta cada etapa, por dónde pasan las dependencias y qué queda
 * relacionado con lo que el usuario seleccionó. Puras, para poder probarlas.
 */

export type WorkflowSelection =
  | { kind: "stage"; code: string }
  | { kind: "step"; code: string }
  | { kind: "transition"; code: string }
  | null;

export type RelatedNodes = Readonly<{
  steps: Set<string>;
  stages: Set<string>;
  transitions: Set<string>;
}>;

export function mapActors(
  stages: readonly WorkflowStage[],
): Map<string, string> {
  const actors = new Map<string, string>();
  const visit = (stage: WorkflowStage) => {
    actors.set(stage.stageCode, stage.actorType);
    stage.subStages.forEach(visit);
  };
  stages.forEach(visit);
  return actors;
}

export type DependencyPath = Readonly<{
  id: string;
  path: string;
  from: string;
  to: string;
}>;

/**
 * Dependencias entre nodos. Se dibujan por ARRIBA de las tarjetas y punteadas
 * para no confundirlas con las transiciones: una dependencia no es un camino
 * que el proceso recorre, es un requisito previo del paso destino.
 */
export function buildDependencies(
  tree: WorkflowTree,
  layout: WorkflowGraphLayout,
): DependencyPath[] {
  const result: DependencyPath[] = [];
  let lane = 0;
  const visit = (stage: WorkflowStage) => {
    for (const step of stage.steps) {
      for (const dependency of step.dependsOn) {
        const from = layout.nodeById.get(dependency.stepCode);
        const to = layout.nodeById.get(step.stepCode);
        if (!from || !to) continue;
        const arcY = Math.min(from.y, to.y) - 22 - (lane % 4) * 14;
        lane += 1;
        const startX = from.x + from.width / 2;
        const endX = to.x + to.width / 2;
        result.push({
          id: `${dependency.stepCode}->${step.stepCode}`,
          from: dependency.stepCode,
          to: step.stepCode,
          path: `M ${startX} ${from.y} C ${startX} ${arcY}, ${endX} ${arcY}, ${endX} ${to.y - 6}`,
        });
      }
    }
    stage.subStages.forEach(visit);
  };
  tree.stages.forEach(visit);
  return result;
}

/**
 * Vecindario declarado de la selección. Es lo que se resalta y, sobre todo, lo
 * que se atenúa: en un flujo de 57 pasos, ver de golpe todas las flechas es
 * igual de inútil que no ver ninguna.
 */
export function relatedNodes(
  tree: WorkflowTree,
  selection: WorkflowSelection,
): RelatedNodes | null {
  if (!selection) return null;
  const steps = new Set<string>();
  const stages = new Set<string>();
  const transitions = new Set<string>();

  const stageOf = new Map<string, string>();
  const visit = (stage: WorkflowStage) => {
    for (const step of stage.steps) stageOf.set(step.stepCode, stage.stageCode);
    stage.subStages.forEach(visit);
  };
  tree.stages.forEach(visit);

  if (selection.kind === "stage") {
    stages.add(selection.code);
    const stage = findStage(tree.stages, selection.code);
    for (const step of stage ? collectSteps(stage) : [])
      steps.add(step.stepCode);
    for (const sub of stage?.subStages ?? []) stages.add(sub.stageCode);
  }

  if (selection.kind === "step") {
    steps.add(selection.code);
    const step = flattenSteps(tree.stages).find(
      (item) => item.stepCode === selection.code,
    );
    for (const code of step?.nextStepCodes ?? []) steps.add(code);
    for (const code of step?.previousStepCodes ?? []) steps.add(code);
    for (const dependency of step?.dependsOn ?? [])
      steps.add(dependency.stepCode);
  }

  if (selection.kind === "transition") {
    const transition = tree.transitions.find(
      (item) => item.transitionCode === selection.code,
    );
    if (transition?.fromStepCode) steps.add(transition.fromStepCode);
    if (transition?.toStepCode) steps.add(transition.toStepCode);
  }

  for (const code of steps) {
    const stageCode = stageOf.get(code);
    if (stageCode) stages.add(stageCode);
  }
  for (const transition of tree.transitions) {
    const { fromStepCode: from, toStepCode: to } = transition;
    if ((from && steps.has(from)) || (to && steps.has(to))) {
      transitions.add(transition.transitionCode);
    }
  }

  return { steps, stages, transitions };
}

export function findStage(
  stages: readonly WorkflowStage[],
  code: string,
): WorkflowStage | undefined {
  for (const stage of stages) {
    if (stage.stageCode === code) return stage;
    const found = findStage(stage.subStages, code);
    if (found) return found;
  }
  return undefined;
}

export function collectSteps(stage: WorkflowStage): WorkflowStep[] {
  return [...stage.steps, ...stage.subStages.flatMap(collectSteps)];
}

export function flattenSteps(stages: readonly WorkflowStage[]): WorkflowStep[] {
  return stages.flatMap((stage) => collectSteps(stage));
}
