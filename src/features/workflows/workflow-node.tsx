import type { GraphNode, WorkflowLane } from "./workflow-graph-layout";
import { NODE_W } from "./workflow-graph-layout";

/**
 * El nodo del lienzo: una tarjeta real por endpoint, con sus puertos de
 * entrada y salida. Es navegable y seleccionable, pero no se edita ni se
 * arrastra — el catálogo lo publica el backend.
 */

export const ACTOR_COLOR: Record<string, string> = {
  customer: "#6366f1",
  internal_user: "#0ea5e9",
  system: "#64748b",
  external_provider: "#a855f7",
};

export const ACTOR_LABEL: Record<string, string> = {
  customer: "cliente",
  internal_user: "interno",
  system: "sistema",
  external_provider: "proveedor",
};

const METHOD_FILL: Record<string, string> = {
  GET: "#2563eb",
  POST: "#059669",
  PUT: "#d97706",
  PATCH: "#d97706",
  DELETE: "#dc2626",
};

export function WorkflowNodeCard({
  node,
  selected,
  highlighted,
  dimmed,
}: Readonly<{
  node: GraphNode;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
}>) {
  const accent = ACTOR_COLOR[node.actorType] ?? "#64748b";
  const method = node.step.httpMethod;
  return (
    <g opacity={dimmed ? 0.28 : 1}>
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={12}
        fill="#ffffff"
        stroke={selected ? "#6366f1" : highlighted ? accent : "#dbe2ea"}
        strokeWidth={selected ? 2.5 : highlighted ? 1.8 : 1.2}
        strokeDasharray={node.step.isMandatory ? undefined : "6 4"}
      />
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={4}
        rx={2}
        fill={accent}
      />

      <rect
        x={node.x + 10}
        y={node.y + 13}
        width={44}
        height={17}
        rx={5}
        fill={METHOD_FILL[method] ?? "#64748b"}
      />
      <text
        x={node.x + 32}
        y={node.y + 25}
        textAnchor="middle"
        fontSize={9}
        fontWeight={700}
        fontFamily="ui-monospace, monospace"
        fill="#ffffff"
      >
        {method}
      </text>
      <text
        x={node.x + 60}
        y={node.y + 26}
        fontSize={9.5}
        fontFamily="ui-monospace, monospace"
        fill="#334155"
      >
        {clip(node.step.routePath, 26)}
      </text>

      <text
        x={node.x + 10}
        y={node.y + 46}
        fontSize={11}
        fontWeight={600}
        fill="#0f172a"
      >
        {clip(node.step.name, 34)}
      </text>
      <text
        x={node.x + 10}
        y={node.y + 62}
        fontSize={8.5}
        fontFamily="ui-monospace, monospace"
        fill="#94a3b8"
      >
        {clip(node.step.stepCode, 34)}
      </text>

      {node.step.isFlowEntry ? (
        <Tag
          x={node.x + NODE_W - 58}
          y={node.y + 50}
          label="entrada"
          fill="#dcfce7"
          ink="#15803d"
        />
      ) : null}
      {node.step.isFlowExit ? (
        <Tag
          x={node.x + NODE_W - 52}
          y={node.y + 50}
          label="salida"
          fill="#fee2e2"
          ink="#b91c1c"
        />
      ) : null}

      {/* Puertos: dan la lectura de grafo aunque el nodo no tenga aristas. */}
      <circle
        cx={node.x}
        cy={node.y + node.height / 2}
        r={3.5}
        fill="#94a3b8"
      />
      <circle
        cx={node.x + node.width}
        cy={node.y + node.height / 2}
        r={3.5}
        fill={accent}
      />
    </g>
  );
}

/** Caja de la etapa: agrupa las columnas de sus subetapas. */
export function WorkflowLaneGroup({
  lane,
  dimmed,
}: Readonly<{ lane: WorkflowLane; dimmed: boolean }>) {
  const accent = ACTOR_COLOR[lane.stage.actorType] ?? "#64748b";
  const { x, top } = lane;
  return (
    <g opacity={dimmed ? 0.35 : 1}>
      <rect
        x={x - 16}
        y={top}
        width={lane.width + 32}
        height={lane.bottom - top}
        rx={16}
        fill={lane.depth === 0 ? "#f8fafc" : "#ffffff"}
        stroke={lane.stage.isOptional ? "#cbd5e1" : `${accent}66`}
        strokeWidth={1.2}
        strokeDasharray={lane.stage.isOptional ? "7 5" : undefined}
      />
      <text
        x={x - 6}
        y={top + 18}
        fontSize={11.5}
        fontWeight={700}
        fill="#0f172a"
      >
        {clip(lane.stage.name, 34)}
      </text>
      <text
        x={x - 6}
        y={top + 32}
        fontSize={8.5}
        fontFamily="ui-monospace, monospace"
        fill="#94a3b8"
      >
        {lane.stage.moduleCode} ·{" "}
        {ACTOR_LABEL[lane.stage.actorType] ?? lane.stage.actorType}
        {lane.stage.isOptional ? " · opcional" : ""}
      </text>
    </g>
  );
}

function Tag({
  x,
  y,
  label,
  fill,
  ink,
}: Readonly<{
  x: number;
  y: number;
  label: string;
  fill: string;
  ink: string;
}>) {
  const width = label.length * 5.2 + 12;
  return (
    <g>
      <rect x={x} y={y} width={width} height={15} rx={7} fill={fill} />
      <text
        x={x + width / 2}
        y={y + 10.5}
        textAnchor="middle"
        fontSize={8}
        fontWeight={700}
        fill={ink}
      >
        {label}
      </text>
    </g>
  );
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const half = Math.floor((max - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(text.length - half)}`;
}
