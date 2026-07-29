import {
  NODE_H,
  NODE_W,
  NODE_X,
  edgeLabelPoint,
  edgePath,
  nodeY,
} from "./journey-tree-layout";
import type { DataFlowEdge } from "./journey-tree-model";

/**
 * El carril izquierdo: las curvas que representan un dato extraído por un paso
 * y consumido por otro. Es la parte que convierte una lista de llamadas en una
 * cadena — sin ellas el dibujo sería un simple listado vertical.
 */

const BROKEN = "#ef4444";
const FLOW = "#6366f1";

export function DataFlowCurve({
  edge,
  lane,
  active,
  broken,
}: Readonly<{
  edge: DataFlowEdge;
  lane: number;
  active: boolean;
  broken: boolean;
}>) {
  const color = broken ? BROKEN : FLOW;
  const point = edgeLabelPoint(edge, lane);
  const width = edge.variable.length * 5.4 + 14;
  return (
    <g opacity={active ? 1 : 0.45}>
      <path
        d={edgePath(edge, lane)}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2 : 1.3}
        strokeDasharray={broken ? "5 4" : undefined}
        markerEnd={`url(#${broken ? "arrow-no" : "arrow-flow"})`}
      />
      <rect
        x={point.x - width / 2}
        y={point.y - 9}
        width={width}
        height={18}
        rx={9}
        fill="#ffffff"
        stroke={color}
        strokeWidth={1}
      />
      <text
        x={point.x}
        y={point.y + 4}
        textAnchor="middle"
        fontSize={9.5}
        fontFamily="ui-monospace, monospace"
        fill={color}
      >
        {edge.variable}
      </text>
    </g>
  );
}

/** Token que recorre el árbol durante la reproducción. */
export function RunToken({ index }: Readonly<{ index: number }>) {
  return (
    <circle
      cx={NODE_X + NODE_W + 16}
      cy={nodeY(index) + NODE_H / 2}
      r={7}
      fill={FLOW}
      className="animate-pulse"
    />
  );
}
