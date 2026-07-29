"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus, Scan } from "lucide-react";
import { EdgeMarkers } from "./workflow-edges";
import {
  DependencyLayer,
  TerminalLayer,
  TransitionLayer,
} from "./workflow-graph-layers";
import { layoutWorkflowGraph } from "./workflow-graph-layout";
import {
  buildDependencies,
  relatedNodes,
  type WorkflowSelection,
} from "./workflow-graph-helpers";
import { WorkflowLaneGroup, WorkflowNodeCard } from "./workflow-node";
import {
  fitHeight,
  fitToView,
  panBy,
  toTransform,
  zoomAt,
  INITIAL_VIEWPORT,
  type Viewport,
} from "./workflow-viewport";
import type { WorkflowTree } from "./types";

/**
 * Lienzo de nodos del flujo: cada endpoint es un nodo real, colocado en su
 * etapa, unido por las transiciones declaradas. Se navega (arrastrar para
 * mover, rueda para acercar) y se inspecciona, pero NO se edita: el catálogo
 * es del backend y esta vista es su lectura.
 */
export function WorkflowGraphView({
  tree,
  selection,
  showDependencies,
  onSelect,
}: Readonly<{
  tree: WorkflowTree;
  selection: WorkflowSelection;
  showDependencies: boolean;
  onSelect: (selection: WorkflowSelection) => void;
}>) {
  const layout = useMemo(
    () => layoutWorkflowGraph(tree.stages, tree.transitions),
    [tree.stages, tree.transitions],
  );
  const related = useMemo(
    () => relatedNodes(tree, selection),
    [tree, selection],
  );
  const dependencies = useMemo(
    () => buildDependencies(tree, layout),
    [tree, layout],
  );

  const hostRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const applyFit = useCallback(
    (mode: "height" | "all") => {
      const host = hostRef.current?.getBoundingClientRect();
      if (!host) return;
      const content = { width: layout.width, height: layout.height };
      const view = { width: host.width, height: host.height };
      setViewport(
        mode === "all" ? fitToView(content, view) : fitHeight(content, view),
      );
    },
    [layout.width, layout.height],
  );

  // Al abrir (y al cambiar el flujo o su filtro) se encuadra por alto: los
  // nodos se leen y el recorrido se explora a lo ancho.
  useEffect(() => {
    applyFit("height");
  }, [applyFit]);

  function handleWheel(event: React.WheelEvent) {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
      // Sin modificador, la rueda desplaza: así la página no queda atrapada.
      setViewport((current) =>
        panBy(current, { x: -event.deltaX, y: -event.deltaY }),
      );
      return;
    }
    const host = hostRef.current?.getBoundingClientRect();
    if (!host) return;
    const point = {
      x: event.clientX - host.left,
      y: event.clientY - host.top,
    };
    setViewport((current) =>
      zoomAt(current, event.deltaY < 0 ? 1.12 : 1 / 1.12, point),
    );
  }

  return (
    <div className="relative">
      <div
        ref={hostRef}
        data-tutorial-id="workflow-graph"
        className="h-[70vh] min-h-[26rem] cursor-grab overflow-hidden rounded-2xl border border-atlas-border bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-white [background-size:22px_22px] active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { x: event.clientX, y: event.clientY };
          // jsdom no implementa la captura de puntero; en el navegador evita
          // perder el arrastre al salirse del lienzo.
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const origin = dragRef.current;
          if (!origin) return;
          const delta = {
            x: event.clientX - origin.x,
            y: event.clientY - origin.y,
          };
          dragRef.current = { x: event.clientX, y: event.clientY };
          setViewport((current) => panBy(current, delta));
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
      >
        <svg
          width="100%"
          height="100%"
          aria-label={`Lienzo del flujo ${tree.name}: ${tree.totals.steps} endpoints en ${tree.totals.stages} etapas`}
        >
          <EdgeMarkers />
          <g transform={toTransform(viewport)}>
            {layout.lanes.map((lane) => {
              const width = lane.width;
              const headerTop = lane.top;
              return (
                <g key={lane.stage.stageCode}>
                  <WorkflowLaneGroup
                    lane={lane}
                    dimmed={
                      Boolean(related) &&
                      !related?.stages.has(lane.stage.stageCode)
                    }
                  />
                  {/* Sólo la cabecera es pulsable: un área del tamaño de la
                      columna robaría los clics de arrastrar el lienzo. */}
                  <rect
                    role="button"
                    tabIndex={0}
                    aria-label={`Etapa ${lane.stage.name}, módulo ${lane.stage.moduleCode}, actor ${lane.stage.actorType}`}
                    className="cursor-pointer"
                    x={lane.x - 16}
                    y={headerTop}
                    width={width + 32}
                    height={40}
                    fill="transparent"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "stage", code: lane.stage.stageCode });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect({ kind: "stage", code: lane.stage.stageCode });
                      }
                    }}
                  />
                </g>
              );
            })}

            <DependencyLayer
              dependencies={dependencies}
              related={related}
              showAll={showDependencies}
            />

            <TransitionLayer
              edges={layout.edges}
              related={related}
              onSelect={onSelect}
            />

            {layout.nodes.map((node) => (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer focus:outline-none"
                aria-label={`Paso ${node.step.httpMethod} ${node.step.routePath}: ${node.step.name}`}
                aria-pressed={
                  selection?.kind === "step" && selection.code === node.id
                }
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect({ kind: "step", code: node.id });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({ kind: "step", code: node.id });
                  }
                }}
              >
                <WorkflowNodeCard
                  node={node}
                  selected={
                    selection?.kind === "step" && selection.code === node.id
                  }
                  highlighted={Boolean(related?.steps.has(node.id))}
                  dimmed={Boolean(related) && !related?.steps.has(node.id)}
                />
              </g>
            ))}
            <TerminalLayer terminals={layout.terminals} />
          </g>
        </svg>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-atlas-border bg-white/95 p-1 shadow-subtle">
        <ZoomButton
          label="Alejar"
          onClick={() =>
            setViewport((v) => zoomAt(v, 1 / 1.2, center(hostRef)))
          }
        >
          <Minus className="h-4 w-4" />
        </ZoomButton>
        <span className="w-12 text-center text-[0.6875rem] tabular-nums text-atlas-muted">
          {Math.round(viewport.scale * 100)}%
        </span>
        <ZoomButton
          label="Acercar"
          onClick={() => setViewport((v) => zoomAt(v, 1.2, center(hostRef)))}
        >
          <Plus className="h-4 w-4" />
        </ZoomButton>
        <ZoomButton
          label="Encuadrar a tamaño de lectura"
          onClick={() => applyFit("height")}
        >
          <Scan className="h-4 w-4" />
        </ZoomButton>
        <ZoomButton label="Ver el flujo entero" onClick={() => applyFit("all")}>
          <Maximize2 className="h-4 w-4" />
        </ZoomButton>
      </div>
    </div>
  );
}

function center(ref: React.RefObject<HTMLDivElement | null>) {
  const box = ref.current?.getBoundingClientRect();
  return { x: (box?.width ?? 0) / 2, y: (box?.height ?? 0) / 2 };
}

function ZoomButton({
  label,
  onClick,
  children,
}: Readonly<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md p-1.5 text-atlas-muted transition-colors hover:bg-atlas-soft hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
    >
      {children}
    </button>
  );
}
