import {
  NODE_H,
  NODE_W,
  NODE_X,
  nodeY,
  truncateMiddle,
} from "./journey-tree-layout";
import type { JourneyTreeNode, NodeState } from "./journey-tree-model";

/**
 * Piezas SVG de la caja de un paso. Todo el color vive aquí (y en
 * `journey-tree-branches`) para que el diagrama se lea igual en cualquier
 * pantalla sin depender de clases Tailwind dentro del SVG.
 */

export const STATE_STYLE: Record<
  NodeState,
  { stroke: string; fill: string; ink: string; label: string }
> = {
  ok: {
    stroke: "#10b981",
    fill: "#ecfdf5",
    ink: "#047857",
    label: "responde lo esperado",
  },
  failed: {
    stroke: "#ef4444",
    fill: "#fef2f2",
    ink: "#b91c1c",
    label: "falla",
  },
  "at-risk": {
    stroke: "#f59e0b",
    fill: "#fffbeb",
    ink: "#b45309",
    label: "en riesgo: le llega un dato sin resolver",
  },
  pending: {
    stroke: "#cbd5e1",
    fill: "#ffffff",
    ink: "#64748b",
    label: "aún no evaluado",
  },
};

const METHOD_FILL: Record<string, string> = {
  GET: "#2563eb",
  POST: "#059669",
  PUT: "#d97706",
  PATCH: "#d97706",
  DELETE: "#dc2626",
};

const CHIP_H = 17;

export function TreeNodeBox({
  node,
  state,
  selected,
  highlighted,
}: Readonly<{
  node: JourneyTreeNode;
  state: NodeState;
  selected: boolean;
  highlighted: boolean;
}>) {
  const style = STATE_STYLE[state];
  const y = nodeY(node.index);
  const dim = state === "pending" && !selected;

  return (
    <g opacity={dim ? 0.55 : 1}>
      <rect
        x={NODE_X}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={14}
        fill={style.fill}
        stroke={selected ? "#6366f1" : style.stroke}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      {highlighted && !selected ? (
        <rect
          x={NODE_X - 3}
          y={y - 3}
          width={NODE_W + 6}
          height={NODE_H + 6}
          rx={17}
          fill="none"
          stroke="#6366f1"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ) : null}

      <circle cx={NODE_X + 22} cy={y + 22} r={12} fill={style.stroke} />
      <text
        x={NODE_X + 22}
        y={y + 26}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="#ffffff"
      >
        {node.index + 1}
      </text>

      <MethodChip x={NODE_X + 42} y={y + 12} method={node.method} />
      <text
        x={NODE_X + 96}
        y={y + 25}
        fontSize={10}
        fontFamily="ui-monospace, monospace"
        fill="#64748b"
      >
        {truncateMiddle(node.key, 24)}
      </text>

      <text
        x={NODE_X + 16}
        y={y + 50}
        fontSize={12.5}
        fontWeight={600}
        fill="#0f172a"
      >
        {truncateMiddle(node.name, 40)}
      </text>
      <text
        x={NODE_X + 16}
        y={y + 66}
        fontSize={10.5}
        fontFamily="ui-monospace, monospace"
        fill={node.resolved ? "#475569" : "#b45309"}
      >
        {node.resolved
          ? truncateMiddle(node.route, 44)
          : "endpoint sin resolver en el catálogo"}
      </text>

      <NodeChips node={node} y={y + NODE_H - 24} />
    </g>
  );
}

function NodeChips({
  node,
  y,
}: Readonly<{ node: JourneyTreeNode; y: number }>) {
  const chips: { label: string; tone: ChipTone }[] = [];
  // Con muchas variables la etiqueta se acorta en vez de empujar fuera de la
  // caja a la de escritura: perder «escribe» sería perder el aviso importante.
  if (node.produces.length > 0) {
    chips.push({
      label: truncateMiddle(
        `extrae ${node.produces.map((v) => v.name).join(", ")}`,
        26,
      ),
      tone: "produce",
    });
  }
  if (node.consumes.length > 0) {
    chips.push({
      label: truncateMiddle(
        `usa ${[...new Set(node.consumes.map((u) => u.name))].join(", ")}`,
        26,
      ),
      tone: "consume",
    });
  }
  if (node.destructive) chips.push({ label: "destructivo", tone: "danger" });
  else if (node.mutating) chips.push({ label: "escribe", tone: "warn" });

  let x = NODE_X + 16;
  return (
    <>
      {chips.map((chip) => {
        const width = chipWidth(chip.label);
        if (x + width > NODE_X + NODE_W - 12) return null;
        const element = (
          <Chip
            key={chip.label}
            x={x}
            y={y}
            label={chip.label}
            tone={chip.tone}
          />
        );
        x += width + 6;
        return element;
      })}
    </>
  );
}

type ChipTone = "produce" | "consume" | "warn" | "danger" | "neutral";

const CHIP_STYLE: Record<ChipTone, { fill: string; ink: string }> = {
  produce: { fill: "#d1fae5", ink: "#047857" },
  consume: { fill: "#e0e7ff", ink: "#4338ca" },
  warn: { fill: "#fef3c7", ink: "#b45309" },
  danger: { fill: "#fee2e2", ink: "#b91c1c" },
  neutral: { fill: "#f1f5f9", ink: "#475569" },
};

export function chipWidth(label: string): number {
  return Math.round(label.length * 5.5) + 14;
}

export function Chip({
  x,
  y,
  label,
  tone,
}: Readonly<{ x: number; y: number; label: string; tone: ChipTone }>) {
  const style = CHIP_STYLE[tone];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={chipWidth(label)}
        height={CHIP_H}
        rx={8}
        fill={style.fill}
      />
      <text
        x={x + 7}
        y={y + 12}
        fontSize={9.5}
        fontFamily="ui-monospace, monospace"
        fill={style.ink}
      >
        {label}
      </text>
    </g>
  );
}

function MethodChip({
  x,
  y,
  method,
}: Readonly<{ x: number; y: number; method: string }>) {
  const fill = METHOD_FILL[method] ?? "#64748b";
  return (
    <g>
      <rect x={x} y={y} width={46} height={19} rx={6} fill={fill} />
      <text
        x={x + 23}
        y={y + 13.5}
        textAnchor="middle"
        fontSize={9.5}
        fontWeight={700}
        fontFamily="ui-monospace, monospace"
        fill="#ffffff"
      >
        {method}
      </text>
    </g>
  );
}
