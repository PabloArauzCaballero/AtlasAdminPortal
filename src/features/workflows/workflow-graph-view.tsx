"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { EdgeMarkers } from "./workflow-edges";
import { GraphControls } from "./workflow-graph-controls";
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
import { WorkflowMinimap } from "./workflow-minimap";
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
  expanded,
  onSelect,
  onToggleExpanded,
}: Readonly<{
  tree: WorkflowTree;
  selection: WorkflowSelection;
  showDependencies: boolean;
  expanded: boolean;
  onSelect: (selection: WorkflowSelection) => void;
  onToggleExpanded: () => void;
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
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // El tamaño del lienzo cambia al entrar en pantalla completa o al redimensionar
  // la ventana; sin observarlo, el encuadre y el minimapa quedarían desfasados.
  // `ResizeObserver` no existe en jsdom (ni en algún navegador viejo): sin este
  // repliegue, el lienzo entero reventaba en las pruebas.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const box = host.getBoundingClientRect();
      setHostSize({ width: box.width, height: box.height });
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const applyFit = useCallback(
    (mode: "height" | "all") => {
      const host = hostRef.current?.getBoundingClientRect();
      if (!host || host.width === 0) return;
      const content = { width: layout.width, height: layout.height };
      const view = { width: host.width, height: host.height };
      setViewport(
        mode === "all" ? fitToView(content, view) : fitHeight(content, view),
      );
    },
    [layout.width, layout.height],
  );

  // Al abrir (y al cambiar el flujo, su filtro o el tamaño del lienzo) se
  // encuadra por alto: los nodos se leen y el recorrido se explora a lo ancho.
  useEffect(() => {
    applyFit("height");
  }, [applyFit, hostSize.width, hostSize.height]);

  /** Centra el lienzo en un punto del contenido (usado por el minimapa). */
  function jumpTo(point: { x: number; y: number }) {
    setViewport((current) => ({
      ...current,
      x: hostSize.width / 2 - point.x * current.scale,
      y: hostSize.height / 2 - point.y * current.scale,
    }));
  }

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
    <div className="relative h-full">
      <div
        ref={hostRef}
        data-tutorial-id="workflow-graph"
        className={cn(
          "cursor-grab overflow-hidden rounded-2xl border border-atlas-border bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-white [background-size:22px_22px] active:cursor-grabbing",
          expanded ? "h-full" : "h-[calc(100vh-19rem)] min-h-[30rem]",
        )}
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

      <GraphControls
        viewport={viewport}
        expanded={expanded}
        onZoom={(factor) =>
          setViewport((current) => zoomAt(current, factor, center(hostRef)))
        }
        onFit={applyFit}
        onToggleExpanded={onToggleExpanded}
      />

      <div className="absolute bottom-3 left-3">
        <WorkflowMinimap
          layout={layout}
          viewport={viewport}
          host={hostSize}
          onJump={jumpTo}
        />
      </div>
    </div>
  );
}

function center(ref: React.RefObject<HTMLDivElement | null>) {
  const box = ref.current?.getBoundingClientRect();
  return { x: (box?.width ?? 0) / 2, y: (box?.height ?? 0) / 2 };
}
