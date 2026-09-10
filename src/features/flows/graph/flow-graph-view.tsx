"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import type { FlowGraph } from "../types";
import { FlowNodeCard, type FlowNodeData } from "./flow-node-card";
import { layoutGraph, type LayoutResult } from "./graph-layout";

const nodeTypes = { card: FlowNodeCard };
/** El minimapa no pinta nodos personalizados sin color explícito: sin esto queda un rectángulo blanco. */
const MINIMAP_COLOR: Record<string, string> = {
  CLIENT: "#7dd3fc",
  ACTOR: "#7dd3fc",
  ENDPOINT: "#0f766e",
  GUARD: "#fcd34d",
  HANDLER: "#6ee7b7",
  CONTROLLER: "#6ee7b7",
  SERVICE: "#6ee7b7",
  REPOSITORY: "#6ee7b7",
  DATABASE: "#c4b5fd",
  ERROR: "#fca5a5",
  BLOCK_CALL: "#fdba74",
  EVENT: "#f9a8d4",
  UNKNOWN: "#cbd5e1",
};

type Props = Readonly<{
  graph: FlowGraph;
  onSelectFlow?: (flowId: string) => void;
}>;

/** Conjunto de nodos alcanzables hacia arriba y hacia abajo desde uno: es lo que se resalta al seleccionar. */
function related(graph: FlowGraph, nodeId: string): Set<string> {
  const out = new Set<string>([nodeId]);
  const walk = (id: string, dir: "up" | "down") => {
    for (const edge of graph.edges) {
      const next =
        dir === "down" && edge.source === id
          ? edge.target
          : dir === "up" && edge.target === id
            ? edge.source
            : null;
      if (next && !out.has(next)) {
        out.add(next);
        walk(next, dir);
      }
    }
  };
  walk(nodeId, "up");
  walk(nodeId, "down");
  return out;
}

export function FlowGraphView(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({ graph, onSelectFlow }: Props) {
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const { fitView, setCenter } = useReactFlow();

  useEffect(() => {
    let cancelled = false;
    setLayout(null);
    setError(null);
    const started = performance.now();
    layoutGraph(graph)
      .then((result) => {
        if (cancelled) return;
        setLayout(result);
        requestAnimationFrame(() =>
          setRenderMs(Math.round(performance.now() - started)),
        );
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo calcular el layout.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [graph]);

  const highlighted = useMemo(
    () => (selected ? related(graph, selected) : null),
    [graph, selected],
  );

  const nodes = useMemo<Node<FlowNodeData>[]>(
    () =>
      layout
        ? graph.nodes.map((node) => {
            const pos = layout.positions.get(node.id) ?? { x: 0, y: 0 };
            return {
              id: node.id,
              type: "card",
              position: { x: pos.x, y: pos.y },
              data: {
                ...node,
                dimmed: highlighted ? !highlighted.has(node.id) : false,
              },
              selected: node.id === selected,
              draggable: true,
            };
          })
        : [],
    [graph.nodes, layout, highlighted, selected],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => {
        const active = highlighted
          ? highlighted.has(edge.source) && highlighted.has(edge.target)
          : true;
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          type: "smoothstep",
          animated: active && Boolean(selected),
          style: {
            stroke: edge.confidence < 70 ? "#94a3b8" : "#0f766e",
            strokeDasharray: edge.confidence < 70 ? "6 4" : undefined,
            opacity: active ? 1 : 0.15,
          },
          labelStyle: { fontSize: 9, fill: "#64748b" },
          data: {
            relation: edge.relation,
            confidence: edge.confidence,
            evidence: edge.evidence,
          },
        };
      }),
    [graph.edges, highlighted, selected],
  );

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    setSelected((current) => (current === node.id ? null : node.id));
    const flowId = (node.data as FlowNodeData).meta?.flowId as
      string | undefined;
    if (flowId && onSelectFlow) onSelectFlow(flowId);
  };

  const onSearch = (value: string) => {
    setSearch(value);
    if (!value.trim() || !layout) return;
    const hit = graph.nodes.find((node) =>
      `${node.label} ${node.sublabel ?? ""}`
        .toLowerCase()
        .includes(value.toLowerCase()),
    );
    const pos = hit ? layout.positions.get(hit.id) : null;
    if (hit && pos) {
      setSelected(hit.id);
      void setCenter(pos.x + 116, pos.y + 32, { zoom: 1, duration: 300 });
    }
  };

  if (error) return <ErrorState description={error} />;
  if (!layout) return <LoadingSkeleton rows={8} />;

  return (
    <div
      className="relative h-[70vh] min-h-[480px] w-full overflow-hidden rounded-xl border border-atlas-border bg-white"
      data-testid="flow-graph"
      data-nodes={graph.stats.nodes}
      data-edges={graph.stats.edges}
      data-layout-ms={layout.elapsedMs}
      data-render-ms={renderMs ?? ""}
    >
      <div className="absolute left-3 top-3 z-10 flex w-72 items-center gap-2">
        <Input
          value={search}
          placeholder="Buscar nodo y centrar…"
          onChange={(event) => onSearch(event.target.value)}
          aria-label="Buscar nodo"
        />
      </div>
      <div className="absolute right-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-[11px] text-atlas-muted shadow-subtle">
        {graph.stats.nodes} nodos · {graph.stats.edges} aristas ·{" "}
        {graph.stats.unknown} sin resolver · layout {layout.elapsedMs} ms
        {renderMs !== null ? ` · render ${renderMs} ms` : ""}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelected(null)}
        onInit={() => void fitView({ padding: 0.1 })}
        fitView
        minZoom={0.1}
        maxZoom={2}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={(node) =>
            MINIMAP_COLOR[(node.data as FlowNodeData).type] ?? "#cbd5e1"
          }
        />
      </ReactFlow>
    </div>
  );
}
