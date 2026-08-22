"use client";

import {
  CONDITION_COLOR,
  CONDITION_LABEL,
  DEPENDENCY_COLOR,
} from "./workflow-edges";
import type {
  GraphEdge,
  GraphTerminal,
  WorkflowLane,
} from "./workflow-graph-layout";
import { WorkflowLaneGroup } from "./workflow-node";
import type {
  DependencyPath,
  RelatedNodes,
  WorkflowSelection,
} from "./workflow-graph-helpers";

/**
 * Capas de aristas del lienzo: transiciones (el camino que el proceso recorre),
 * dependencias (requisitos previos) y los distintivos de entrada y salida.
 * Separadas del viewport para que cada archivo tenga un solo motivo de cambio.
 */

export function TransitionLayer({
  edges,
  related,
  onSelect,
}: Readonly<{
  edges: readonly GraphEdge[];
  related: RelatedNodes | null;
  onSelect: (selection: WorkflowSelection) => void;
}>) {
  return (
    <>
      {edges.map((edge) => {
        const { transition } = edge;
        const color = CONDITION_COLOR[transition.conditionType] ?? "#64748b";
        const active =
          !related || related.transitions.has(transition.transitionCode);
        const select = () =>
          onSelect({ kind: "transition", code: transition.transitionCode });
        return (
          <g
            key={edge.id}
            opacity={active ? 1 : 0.18}
            role="button"
            tabIndex={0}
            className="cursor-pointer"
            aria-label={`Transición ${transition.transitionCode}: ${transition.description ?? ""}`}
            onClick={(event) => {
              event.stopPropagation();
              select();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                select();
              }
            }}
          >
            <path
              d={edge.path}
              fill="none"
              stroke={color}
              strokeWidth={transition.isDefaultPath ? 2 : 1.5}
              strokeDasharray={transition.isDefaultPath ? undefined : "7 5"}
              markerEnd={`url(#wf-arrow-${transition.conditionType})`}
            />
            {/* El verde ya dice «si sale bien» (está en la leyenda): rotular las
                21 transiciones de éxito sólo taparía el lienzo. */}
            {transition.conditionType !== "on_success" ? (
              <EdgeTag
                x={edge.labelX}
                y={edge.labelY}
                label={
                  CONDITION_LABEL[transition.conditionType] ??
                  transition.conditionType
                }
                color={color}
              />
            ) : null}
          </g>
        );
      })}
    </>
  );
}

export function DependencyLayer({
  dependencies,
  related,
  showAll,
}: Readonly<{
  dependencies: readonly DependencyPath[];
  related: RelatedNodes | null;
  showAll: boolean;
}>) {
  return (
    <>
      {dependencies
        .filter(
          (dependency) =>
            showAll ||
            related?.steps.has(dependency.from) ||
            related?.steps.has(dependency.to),
        )
        .map((dependency) => (
          <path
            key={dependency.id}
            d={dependency.path}
            fill="none"
            stroke={DEPENDENCY_COLOR}
            strokeWidth={1.4}
            strokeDasharray="5 4"
            opacity={0.75}
            markerEnd="url(#wf-arrow-dependency)"
          />
        ))}
    </>
  );
}

export function TerminalLayer({
  terminals,
}: Readonly<{ terminals: readonly GraphTerminal[] }>) {
  return (
    <>
      {terminals.map((terminal) => {
        const isEntry = terminal.kind === "entry";
        const ink = isEntry ? "#15803d" : "#b91c1c";
        const width = isEntry ? 72 : 68;
        return (
          <g key={`${terminal.kind}-${terminal.stepCode}`}>
            <path
              d={terminal.path}
              stroke={ink}
              strokeWidth={2}
              fill="none"
              markerEnd="url(#wf-arrow-always)"
            />
            <rect
              x={terminal.x}
              y={terminal.y}
              width={width}
              height={26}
              rx={13}
              fill={isEntry ? "#dcfce7" : "#fee2e2"}
              stroke={ink}
            />
            <text
              x={terminal.x + width / 2}
              y={terminal.y + 17}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={ink}
            >
              {isEntry ? "ENTRADA" : "SALIDA"}
            </text>
          </g>
        );
      })}
    </>
  );
}

function EdgeTag({
  x,
  y,
  label,
  color,
}: Readonly<{ x: number; y: number; label: string; color: string }>) {
  const width = label.length * 5.2 + 14;
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - 9}
        width={width}
        height={18}
        rx={9}
        fill="#ffffff"
        stroke={color}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={8.5}
        fontWeight={600}
        fill={color}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Cajas de etapa. Sólo la cabecera es pulsable: un área del tamaño de la
 * columna robaría los clics de arrastrar el lienzo.
 */
export function LaneLayer({
  lanes,
  related,
  onSelect,
}: Readonly<{
  lanes: readonly WorkflowLane[];
  related: RelatedNodes | null;
  onSelect: (selection: WorkflowSelection) => void;
}>) {
  return (
    <>
      {lanes.map((lane) => {
        const select = () =>
          onSelect({ kind: "stage", code: lane.stage.stageCode });
        return (
          <g key={lane.stage.stageCode}>
            <WorkflowLaneGroup
              lane={lane}
              dimmed={
                Boolean(related) && !related?.stages.has(lane.stage.stageCode)
              }
            />
            <rect
              role="button"
              tabIndex={0}
              aria-label={`Etapa ${lane.stage.name}, módulo ${lane.stage.moduleCode}, actor ${lane.stage.actorType}`}
              className="cursor-pointer"
              x={lane.x - 16}
              y={lane.top}
              width={lane.width + 32}
              height={40}
              fill="transparent"
              onClick={(event) => {
                event.stopPropagation();
                select();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select();
                }
              }}
            />
          </g>
        );
      })}
    </>
  );
}
