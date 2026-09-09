import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { FlowGraph } from "../types";

export const CARD_WIDTH = 232;
export const CARD_HEIGHT = 64;

/**
 * Sin `elk.partitioning`: medido en `tools/bench-elk.mjs` (2026-09-09), la partición por capas multiplica
 * por 25 el tiempo (259 nodos: 2 871 ms → 110 ms; 611 nodos: 29 824 ms → 363 ms). No hace falta, porque
 * el grafo ya es un DAG de izquierda a derecha por construcción (cliente → endpoint → guard → handler → ?).
 * El enrutado ortogonal también se descarta por coste; POLYLINE lee igual de bien con `smoothstep` en xyflow.
 */
export type Positioned = { id: string; x: number; y: number };

export type LayoutResult = {
  positions: Map<string, Positioned>;
  width: number;
  height: number;
  /** Milisegundos que tardó ELK: es la medida que el plan exige (< 500 ms para 150 nodos). */
  elapsedMs: number;
};

const elk = new ELK();

export async function layoutGraph(graph: FlowGraph): Promise<LayoutResult> {
  const started = performance.now();
  const root: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "72",
      "elk.spacing.nodeNode": "20",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.edgeRouting": "POLYLINE",
    },
    children: graph.nodes.map((node) => ({
      id: node.id,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
  const laid = await elk.layout(root);
  const positions = new Map<string, Positioned>();
  for (const child of laid.children ?? []) {
    positions.set(child.id, { id: child.id, x: child.x ?? 0, y: child.y ?? 0 });
  }
  return {
    positions,
    width: laid.width ?? 0,
    height: laid.height ?? 0,
    elapsedMs: Math.round(performance.now() - started),
  };
}
