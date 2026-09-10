import ELK, {
  type ELK as ElkInstance,
  type ElkNode,
} from "elkjs/lib/elk-api.js";
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

/**
 * ELK en un Web Worker, no en el hilo principal.
 *
 * El coste medido no baja (el módulo `systems-ops`, 288 nodos, tarda ~1 s en cualquier caso), pero
 * deja de congelar la interfaz: con `elk.bundled` el navegador no repintaba ni respondía al ratón
 * durante ese segundo, y el skeleton se quedaba a medias. Con el worker, la página sigue viva y el
 * `elapsedMs` que se muestra es el mismo dato de antes, medido igual.
 *
 * `elk-api` + worker propio en vez de `elk.bundled`: el bundle del hilo principal baja de ~1 MB al
 * cliente ligero, y el motor (lo pesado) se carga aparte, sólo cuando hay un grafo que calcular.
 */
let elkInstance: ElkInstance | null = null;
function getElk(): ElkInstance {
  if (elkInstance) return elkInstance;
  elkInstance = new ELK({
    // `new URL(..., import.meta.url)` es lo que hace que el bundler emita el worker como chunk propio.
    workerFactory: () =>
      new Worker(new URL("elkjs/lib/elk-worker.min.js", import.meta.url), {
        type: "classic",
      }),
  });
  return elkInstance;
}

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
  const laid = await getElk().layout(root);
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
