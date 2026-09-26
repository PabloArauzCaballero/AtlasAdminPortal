import type { WorkflowStage, WorkflowStep, WorkflowTransition } from "./types";

/**
 * Layout de GRAFO del flujo: un nodo real por endpoint, colocado en 2D.
 *
 * Las etapas son las columnas (en orden de ejecución) y los pasos de cada una
 * se apilan dentro de su columna; las transiciones son aristas entre nodos con
 * puertos de salida y entrada. Es la forma de un lienzo de workflows —no una
 * lista vertical— y es lo que permite ver de un vistazo qué se bifurca y qué
 * vuelve atrás.
 *
 * Puro y sin DOM: el viewport (pan/zoom) es otro problema, y así la geometría
 * se puede probar.
 */

export const NODE_W = 238;
export const NODE_H = 78;
export const COL_GAP = 76;
export const ROW_GAP = 26;
export const LANE_TOP = 104;
export const DEPTH_OFFSET = 26;
export const MARGIN = 48;

export type WorkflowLane = Readonly<{
  stage: WorkflowStage;
  depth: number;
  column: number;
  x: number;
  /** Columna final del grupo: una etapa madre abarca las de sus subetapas. */
  lastColumn: number;
  /** Caja del grupo, ajustada a su propio contenido. */
  top: number;
  bottom: number;
  width: number;
}>;

export type GraphNode = Readonly<{
  id: string;
  step: WorkflowStep;
  stageCode: string;
  actorType: string;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type GraphEdge = Readonly<{
  id: string;
  transition: WorkflowTransition;
  from: string;
  to: string;
  path: string;
  labelX: number;
  labelY: number;
  /** Va hacia atrás en el recorrido: se dibuja rodeando, no cruzando. */
  isBackward: boolean;
}>;

export type GraphTerminal = Readonly<{
  kind: "entry" | "exit";
  x: number;
  y: number;
  stepCode: string;
  path: string;
}>;

export type WorkflowGraphLayout = Readonly<{
  lanes: readonly WorkflowLane[];
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  terminals: readonly GraphTerminal[];
  nodeById: ReadonlyMap<string, GraphNode>;
  width: number;
  height: number;
}>;

/** Aplana las etapas en orden: madre, luego sus subetapas (cada una, una columna). */
function flattenLanes(
  stages: readonly WorkflowStage[],
): { stage: WorkflowStage; depth: number }[] {
  const lanes: { stage: WorkflowStage; depth: number }[] = [];
  const visit = (stage: WorkflowStage, depth: number) => {
    lanes.push({ stage, depth });
    for (const sub of stage.subStages) visit(sub, depth + 1);
  };
  for (const stage of stages) visit(stage, 0);
  return lanes;
}

export function layoutWorkflowGraph(
  stages: readonly WorkflowStage[],
  transitions: readonly WorkflowTransition[],
): WorkflowGraphLayout {
  const flat = flattenLanes(stages);
  const columnOf = new Map<string, number>();
  flat.forEach((lane, index) => columnOf.set(lane.stage.stageCode, index));

  const placed = flat.map((lane, index) => ({
    stage: lane.stage,
    depth: lane.depth,
    column: index,
    x: MARGIN + index * (NODE_W + COL_GAP),
    lastColumn: index + countDescendantLanes(lane.stage),
  }));

  const nodes: GraphNode[] = [];
  for (const lane of placed) {
    lane.stage.steps.forEach((step, row) => {
      nodes.push({
        id: step.stepCode,
        step,
        stageCode: lane.stage.stageCode,
        actorType: lane.stage.actorType,
        x: lane.x,
        y: LANE_TOP + lane.depth * DEPTH_OFFSET + row * (NODE_H + ROW_GAP),
        width: NODE_W,
        height: NODE_H,
      });
    });
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  // La caja de cada etapa se ajusta a SU contenido (el suyo y el de sus
  // subetapas). Estirarlas todas al alto del lienzo dejaba columnas casi
  // vacías y obligaba a alejar el zoom para ver algo.
  const bottomOfLane = new Map<string, number>();
  for (const lane of placed) {
    const own = nodes
      .filter((node) => node.stageCode === lane.stage.stageCode)
      .reduce((max, node) => Math.max(max, node.y + node.height), 0);
    bottomOfLane.set(lane.stage.stageCode, own);
  }
  const lanes: WorkflowLane[] = placed.map((lane) => {
    const covered = placed.slice(lane.column, lane.lastColumn + 1);
    const bottom = covered.reduce(
      (max, item) => Math.max(max, bottomOfLane.get(item.stage.stageCode) ?? 0),
      LANE_TOP,
    );
    const last = placed[lane.lastColumn] ?? lane;
    return {
      ...lane,
      top: 26 + lane.depth * 24,
      bottom: bottom + 22,
      width: last.x - lane.x + NODE_W,
    };
  });

  const edges: GraphEdge[] = [];
  transitions.forEach((transition, index) => {
    const { fromStepCode, toStepCode } = transition;
    if (!fromStepCode || !toStepCode) return;
    const from = nodeById.get(fromStepCode);
    const to = nodeById.get(toStepCode);
    if (!from || !to) return;
    edges.push(buildEdge(transition, from, to, index));
  });

  const terminals: GraphTerminal[] = [];
  for (const transition of transitions) {
    if (transition.fromStepCode && transition.toStepCode) continue;
    const code = transition.toStepCode ?? transition.fromStepCode;
    const node = code ? nodeById.get(code) : undefined;
    if (!node || !code) continue;
    // Pegado al puerto correspondiente, dentro del hueco entre columnas: encima
    // del nodo se montaba sobre la tarjeta de arriba, y al lado del todo caía
    // dentro de la caja de la etapa vecina.
    const isEntry = !transition.fromStepCode;
    const y = node.y + node.height / 2 - 13;
    const x = isEntry ? node.x - 84 : node.x + node.width + 14;
    terminals.push({
      kind: isEntry ? "entry" : "exit",
      x,
      y,
      stepCode: code,
      path: isEntry
        ? `M ${x + 72} ${y + 13} L ${node.x - 5} ${node.y + node.height / 2}`
        : `M ${node.x + node.width + 5} ${node.y + node.height / 2} L ${x - 2} ${y + 13}`,
    });
  }

  const maxX = nodes.reduce(
    (max, node) => Math.max(max, node.x + node.width),
    0,
  );
  const maxY = lanes.reduce((max, lane) => Math.max(max, lane.bottom), 0);

  return {
    lanes,
    nodes,
    edges,
    terminals,
    nodeById,
    width: maxX + MARGIN + 120,
    height: maxY + MARGIN + 60,
  };
}

function countDescendantLanes(stage: WorkflowStage): number {
  return stage.subStages.reduce(
    (total, sub) => total + 1 + countDescendantLanes(sub),
    0,
  );
}

/**
 * Puertos laterales y curva. Una arista hacia atrás (reintentar, volver a
 * corregir) sale por abajo y rodea: dibujada recta se confundiría con el
 * camino de ida.
 */
function buildEdge(
  transition: WorkflowTransition,
  from: GraphNode,
  to: GraphNode,
  index: number,
): GraphEdge {
  const isBackward = to.x < from.x || (to.x === from.x && to.y < from.y);
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;
  const endX = to.x;
  const endY = to.y + to.height / 2;

  if (!isBackward) {
    const dx = Math.max(48, (endX - startX) / 2);
    return {
      id: transition.transitionCode,
      transition,
      from: from.id,
      to: to.id,
      path: `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX - 6} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2 - 10,
      isBackward: false,
    };
  }

  // Rodeo por debajo, con una calle distinta por arista para que dos retornos
  // no se superpongan en la misma línea.
  const drop = Math.max(from.y, to.y) + NODE_H + 34 + (index % 4) * 16;
  return {
    id: transition.transitionCode,
    transition,
    from: from.id,
    to: to.id,
    path: `M ${startX} ${startY} C ${startX + 40} ${startY}, ${startX + 40} ${drop}, ${(startX + endX) / 2} ${drop} C ${endX - 60} ${drop}, ${endX - 60} ${endY}, ${endX - 6} ${endY}`,
    labelX: (startX + endX) / 2,
    labelY: drop - 10,
    isBackward: true,
  };
}
