import type { LineageEdge, LineageNode } from "./types";

export const CARD_WIDTH = 208;
export const CARD_HEIGHT = 76;
const COLUMN_GAP = 140;
const ROW_GAP = 24;
const PADDING = 32;

export function uniqueValues(
  nodes: LineageNode[],
  key: "domain" | "nodeType",
): string[] {
  const values = new Set(
    nodes.map((node) =>
      key === "domain" ? (node.domain ?? "Sin dominio") : node.nodeType,
    ),
  );
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function toggleSet(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

type PositionedNode = { node: LineageNode; x: number; y: number };
type PositionedEdge = { edgeId: string; path: string };

export function layoutGraph(
  nodes: LineageNode[],
  edges: LineageEdge[],
): {
  positioned: PositionedNode[];
  edges: PositionedEdge[];
  width: number;
  height: number;
} {
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const visibleEdges = edges.filter(
    (edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId),
  );
  const outgoing = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();
  nodes.forEach((node) => incomingCount.set(node.nodeId, 0));
  visibleEdges.forEach((edge) => {
    outgoing.set(edge.sourceNodeId, [
      ...(outgoing.get(edge.sourceNodeId) ?? []),
      edge.targetNodeId,
    ]);
    incomingCount.set(
      edge.targetNodeId,
      (incomingCount.get(edge.targetNodeId) ?? 0) + 1,
    );
  });

  const layerByNode = new Map<string, number>();
  // En un DAG la capa de un nodo nunca supera V-1. El grafo de linaje puede
  // traer ciclos (relaciones bidireccionales), y sin este tope el longest-path
  // re-encolaba nodos indefinidamente: las capas explotaban, el ancho se
  // disparaba y la vista se colgaba. El tope corta los back-edges de ciclos y
  // garantiza terminación; el contador es una malla de seguridad extra.
  const MAX_LAYER = Math.max(1, nodes.length - 1);
  const ITERATION_CAP = nodes.length * nodes.length + nodes.length;
  let roots = nodes.filter(
    (node) => (incomingCount.get(node.nodeId) ?? 0) === 0,
  );
  // Grafo totalmente cíclico: no hay nodos sin entradas. Se elige como raíz el
  // de menor grado de entrada para no dejar todo apilado en una sola columna.
  if (roots.length === 0 && nodes.length > 0) {
    const seed = [...nodes].sort(
      (a, b) =>
        (incomingCount.get(a.nodeId) ?? 0) - (incomingCount.get(b.nodeId) ?? 0),
    )[0];
    roots = [seed];
  }
  const queue: Array<{ nodeId: string; layer: number }> = roots.map((node) => ({
    nodeId: node.nodeId,
    layer: 0,
  }));
  roots.forEach((node) => layerByNode.set(node.nodeId, 0));
  let iterations = 0;
  while (queue.length > 0) {
    if (iterations++ > ITERATION_CAP) break;
    const current = queue.shift();
    if (!current || current.layer >= MAX_LAYER) continue;
    const nextLayer = current.layer + 1;
    for (const targetId of outgoing.get(current.nodeId) ?? []) {
      const existing = layerByNode.get(targetId);
      if (existing === undefined || nextLayer > existing) {
        layerByNode.set(targetId, nextLayer);
        queue.push({ nodeId: targetId, layer: nextLayer });
      }
    }
  }
  nodes.forEach((node) => {
    if (!layerByNode.has(node.nodeId)) layerByNode.set(node.nodeId, 0);
  });

  const columns = new Map<number, LineageNode[]>();
  nodes.forEach((node) => {
    const layer = layerByNode.get(node.nodeId) ?? 0;
    columns.set(layer, [...(columns.get(layer) ?? []), node]);
  });
  const sortedLayers = [...columns.keys()].sort((a, b) => a - b);

  const positionByNode = new Map<string, { x: number; y: number }>();
  let maxRows = 0;
  sortedLayers.forEach((layer, columnIndex) => {
    const columnNodes = [...(columns.get(layer) ?? [])].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    maxRows = Math.max(maxRows, columnNodes.length);
    columnNodes.forEach((node, rowIndex) => {
      positionByNode.set(node.nodeId, {
        x: PADDING + columnIndex * (CARD_WIDTH + COLUMN_GAP),
        y: PADDING + rowIndex * (CARD_HEIGHT + ROW_GAP),
      });
    });
  });

  const positioned: PositionedNode[] = nodes.map((node) => {
    const position = positionByNode.get(node.nodeId) ?? {
      x: PADDING,
      y: PADDING,
    };
    return { node, ...position };
  });

  const positionedEdges: PositionedEdge[] = visibleEdges.map((edge) => {
    const from = positionByNode.get(edge.sourceNodeId);
    const to = positionByNode.get(edge.targetNodeId);
    if (!from || !to) return { edgeId: edge.edgeId, path: "" };
    const x1 = from.x + CARD_WIDTH;
    const y1 = from.y + CARD_HEIGHT / 2;
    const x2 = to.x;
    const y2 = to.y + CARD_HEIGHT / 2;
    const midX = (x1 + x2) / 2;
    return {
      edgeId: edge.edgeId,
      path: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
    };
  });

  return {
    positioned,
    edges: positionedEdges.filter((edge) => edge.path),
    width: PADDING * 2 + sortedLayers.length * (CARD_WIDTH + COLUMN_GAP),
    height: PADDING * 2 + maxRows * (CARD_HEIGHT + ROW_GAP),
  };
}
