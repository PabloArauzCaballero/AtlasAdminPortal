"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  layoutGraph,
  toggleSet,
  uniqueValues,
} from "./lineage-graph-layout";
import { GraphControls, NodeTypeIcon } from "./lineage-graph-controls";
import { NodeDetailDrawer } from "./lineage-node-detail-drawer";
import { RiskBadge } from "@/shared/components/ui/badges";
import { cn } from "@/shared/lib/cn";
import type { LineageEdge, LineageNode } from "./types";

const PADDING = 32;

export function LineageGraphView({
  nodes,
  edges,
}: Readonly<{ nodes: LineageNode[]; edges: LineageEdge[] }>) {
  const domains = useMemo(() => uniqueValues(nodes, "domain"), [nodes]);
  const nodeTypes = useMemo(() => uniqueValues(nodes, "nodeType"), [nodes]);
  const [activeDomains, setActiveDomains] = useState<Set<string>>(
    () => new Set(domains),
  );
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    () => new Set(nodeTypes),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // `domains`/`nodeTypes` se recalculan cuando cambian los `nodes` recibidos
  // (p.ej. al aplicar el filtro de dominio/tipo/búsqueda en la página). Sin
  // este reset, activeDomains/activeTypes quedaban congelados con el set del
  // primer render: los checkboxes del panel aparecían destildados y nodos
  // válidos desaparecían del grafo tras filtrar, sin que el usuario tocara
  // ningún control del grafo.
  useEffect(() => {
    setActiveDomains(new Set(domains));
  }, [domains]);

  useEffect(() => {
    setActiveTypes(new Set(nodeTypes));
  }, [nodeTypes]);

  const visibleNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          activeDomains.has(node.domain ?? "Sin dominio") &&
          activeTypes.has(node.nodeType),
      ),
    [nodes, activeDomains, activeTypes],
  );

  useEffect(() => {
    setSelectedNodeId((current) =>
      current && !visibleNodes.some((node) => node.nodeId === current)
        ? null
        : current,
    );
  }, [visibleNodes]);

  const layout = useMemo(
    () => layoutGraph(visibleNodes, edges),
    [visibleNodes, edges],
  );

  return (
    <div className="relative flex h-[640px] overflow-hidden rounded-xl border border-atlas-border bg-atlas-soft">
      <div className="atlas-scrollbar relative h-full flex-1 overflow-auto">
        <div
          className="relative"
          style={{
            width: Math.max(layout.width, CARD_WIDTH + PADDING * 2),
            height: Math.max(layout.height, CARD_HEIGHT + PADDING * 2),
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={layout.width}
            height={layout.height}
          >
            <defs>
              <marker
                id="lineage-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="#94a3b8" />
              </marker>
            </defs>
            {layout.edges.map((edge) => (
              <path
                key={edge.edgeId}
                d={edge.path}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={2}
                markerEnd="url(#lineage-arrow)"
              />
            ))}
          </svg>
          {layout.positioned.map(({ node, x, y }) => (
            <button
              key={node.nodeId}
              type="button"
              onClick={() => setSelectedNodeId(node.nodeId)}
              className={cn(
                "group absolute flex flex-col gap-2 rounded-lg border bg-white p-3 text-left shadow-subtle transition-colors hover:border-atlas-accent",
                selectedNodeId === node.nodeId
                  ? "border-atlas-accent ring-2 ring-atlas-accent/30"
                  : "border-atlas-border",
              )}
              style={{ left: x, top: y, width: CARD_WIDTH }}
            >
              <div className="flex items-center gap-2">
                <NodeTypeIcon nodeType={node.nodeType} />
                <span className="truncate text-sm font-medium text-atlas-text">
                  {node.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="rounded border border-atlas-border bg-atlas-soft px-1.5 py-0.5 text-[10px] font-mono text-atlas-muted">
                  {node.nodeType}
                </span>
                {node.criticality ? (
                  <RiskBadge value={node.criticality} />
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>
      <GraphControls
        domains={domains}
        activeDomains={activeDomains}
        onToggleDomain={(domain) =>
          setActiveDomains((current) => toggleSet(current, domain))
        }
        nodeTypes={nodeTypes}
        activeTypes={activeTypes}
        onToggleType={(type) =>
          setActiveTypes((current) => toggleSet(current, type))
        }
      />
      {selectedNodeId ? (
        <NodeDetailDrawer
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      ) : null}
    </div>
  );
}
