"use client";

import { ACTOR_COLOR } from "./workflow-node";
import type { WorkflowGraphLayout } from "./workflow-graph-layout";
import type { Viewport } from "./workflow-viewport";

/**
 * Minimapa: en un flujo de 22 columnas, el zoom de lectura sólo deja ver una
 * parte, y sin una vista general se pierde el norte. Muestra todo el grafo en
 * miniatura, dónde está la ventana actual, y permite saltar pulsando.
 */
const MAP_W = 208;
const MAP_H = 104;

export function WorkflowMinimap({
  layout,
  viewport,
  host,
  onJump,
}: Readonly<{
  layout: WorkflowGraphLayout;
  viewport: Viewport;
  host: { width: number; height: number };
  onJump: (point: { x: number; y: number }) => void;
}>) {
  const scale = Math.min(
    (MAP_W - 8) / Math.max(layout.width, 1),
    (MAP_H - 8) / Math.max(layout.height, 1),
  );
  const view = {
    x: (-viewport.x / viewport.scale) * scale + 4,
    y: (-viewport.y / viewport.scale) * scale + 4,
    width: (host.width / viewport.scale) * scale,
    height: (host.height / viewport.scale) * scale,
  };

  return (
    <div className="rounded-lg border border-atlas-border bg-white/95 p-1 shadow-subtle">
      <svg
        width={MAP_W}
        height={MAP_H}
        role="button"
        tabIndex={0}
        aria-label="Minimapa del flujo: pulsa para ir a esa zona"
        className="cursor-pointer"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onJump({
            x: (event.clientX - box.left - 4) / scale,
            y: (event.clientY - box.top - 4) / scale,
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") onJump({ x: 0, y: 0 });
        }}
      >
        <rect width={MAP_W} height={MAP_H} rx={6} fill="#f8fafc" />
        {layout.lanes.map((lane) => (
          <rect
            key={lane.stage.stageCode}
            x={lane.x * scale + 4}
            y={lane.top * scale + 4}
            width={lane.width * scale}
            height={(lane.bottom - lane.top) * scale}
            rx={1.5}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth={0.5}
          />
        ))}
        {layout.nodes.map((node) => (
          <rect
            key={node.id}
            x={node.x * scale + 4}
            y={node.y * scale + 4}
            width={Math.max(1.5, node.width * scale)}
            height={Math.max(1, node.height * scale)}
            rx={1}
            fill={ACTOR_COLOR[node.actorType] ?? "#94a3b8"}
            opacity={0.85}
          />
        ))}
        <rect
          x={view.x}
          y={view.y}
          width={Math.max(6, view.width)}
          height={Math.max(6, view.height)}
          fill="rgba(99,102,241,0.12)"
          stroke="#6366f1"
          strokeWidth={1.2}
          rx={2}
        />
      </svg>
    </div>
  );
}
