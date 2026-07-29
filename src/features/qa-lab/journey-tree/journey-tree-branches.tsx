import {
  BRANCH_H,
  BRANCH_W,
  BRANCH_X,
  DIAMOND_H,
  DIAMOND_W,
  NODE_H,
  NODE_W,
  NODE_X,
  diamondCx,
  diamondCy,
  nodeY,
  wrapText,
} from "./journey-tree-layout";
import type { NodeState } from "./journey-tree-model";

/**
 * La bifurcación de cada paso: el rombo de decisión (¿el estado HTTP es el
 * esperado?), la rama «sí» que baja al siguiente paso y la rama «no» con su
 * consecuencia, más la caja final del recorrido.
 */

const YES = "#10b981";
const NO = "#ef4444";
const IDLE = "#cbd5e1";
const FLOW = "#6366f1";

export function ArrowDefs() {
  return (
    <defs>
      {[
        ["arrow-yes", YES],
        ["arrow-no", NO],
        ["arrow-idle", IDLE],
        ["arrow-flow", FLOW],
      ].map(([id, color]) => (
        <marker
          key={id}
          id={id}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      ))}
    </defs>
  );
}

export function DecisionDiamond({
  index,
  expected,
  state,
}: Readonly<{ index: number; expected: readonly number[]; state: NodeState }>) {
  const cx = diamondCx();
  const cy = diamondCy(index);
  const hw = DIAMOND_W / 2;
  const hh = DIAMOND_H / 2;
  const active = state !== "pending";
  const codes = expected.slice(0, 3).join(" · ");
  const suffix = expected.length > 3 ? "…" : "";

  return (
    <g opacity={active ? 1 : 0.55}>
      <polygon
        points={`${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`}
        fill="#ffffff"
        stroke={state === "ok" ? YES : state === "failed" ? NO : "#94a3b8"}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy + 3.5}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={600}
        fill="#334155"
      >
        {`¿responde ${codes}${suffix}?`}
      </text>
    </g>
  );
}

export function YesBranch({
  index,
  isLast,
  taken,
}: Readonly<{ index: number; isLast: boolean; taken: boolean }>) {
  const cx = diamondCx();
  const from = diamondCy(index) + DIAMOND_H / 2;
  const to = isLast
    ? nodeY(index) + NODE_H + DIAMOND_H + 26
    : nodeY(index + 1) - 2;
  const color = taken ? YES : IDLE;
  return (
    <g>
      <line
        x1={cx}
        y1={from}
        x2={cx}
        y2={to}
        stroke={color}
        strokeWidth={taken ? 2.2 : 1.4}
        markerEnd={taken ? "url(#arrow-yes)" : "url(#arrow-idle)"}
      />
      <BranchLabel x={cx + 10} y={(from + to) / 2} label="sí" color={color} />
    </g>
  );
}

export function NoBranch({
  index,
  taken,
}: Readonly<{ index: number; taken: boolean }>) {
  const cy = diamondCy(index);
  const from = diamondCx() + DIAMOND_W / 2;
  const color = taken ? NO : IDLE;
  return (
    <g>
      <line
        x1={from}
        y1={cy}
        x2={BRANCH_X - 2}
        y2={cy}
        stroke={color}
        strokeWidth={taken ? 2.2 : 1.4}
        strokeDasharray={taken ? undefined : "5 4"}
        markerEnd={taken ? "url(#arrow-no)" : "url(#arrow-idle)"}
      />
      <BranchLabel
        x={(from + BRANCH_X) / 2 - 8}
        y={cy - 8}
        label="no"
        color={color}
      />
    </g>
  );
}

export function ConsequenceBox({
  index,
  text,
  taken,
}: Readonly<{ index: number; text: string; taken: boolean }>) {
  const y = diamondCy(index) - BRANCH_H / 2;
  const lines = wrapText(text, 34, 4);
  return (
    <g opacity={taken ? 1 : 0.6}>
      <rect
        x={BRANCH_X}
        y={y}
        width={BRANCH_W}
        height={BRANCH_H}
        rx={12}
        fill={taken ? "#fef2f2" : "#f8fafc"}
        stroke={taken ? NO : "#e2e8f0"}
        strokeWidth={1.2}
        strokeDasharray={taken ? undefined : "5 4"}
      />
      {lines.map((line, i) => (
        <text
          key={line}
          x={BRANCH_X + 12}
          y={y + 20 + i * 13}
          fontSize={9.8}
          fill={taken ? "#b91c1c" : "#64748b"}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function TerminalBox({
  count,
  failed,
  atRisk,
}: Readonly<{ count: number; failed: number; atRisk: number }>) {
  const y = nodeY(count - 1) + NODE_H + DIAMOND_H + 28;
  const clean = failed === 0 && atRisk === 0;
  const label = clean
    ? "Recorrido completo: todos los pasos responden y los datos encadenan"
    : `Recorrido terminado: ${outcomeParts(failed, atRisk).join(" y ")}`;
  const lines = wrapText(label, 46, 2);
  return (
    <g>
      <rect
        x={NODE_X}
        y={y}
        width={NODE_W}
        height={42}
        rx={21}
        fill={clean ? "#ecfdf5" : "#fffbeb"}
        stroke={clean ? YES : "#f59e0b"}
        strokeWidth={1.5}
      />
      {lines.map((line, i) => (
        <text
          key={line}
          x={NODE_X + NODE_W / 2}
          y={y + (lines.length === 1 ? 26 : 19 + i * 13)}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill={clean ? "#047857" : "#b45309"}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function outcomeParts(failed: number, atRisk: number): string[] {
  const parts: string[] = [];
  if (failed > 0) {
    parts.push(failed === 1 ? "1 paso falla" : `${failed} pasos fallan`);
  }
  if (atRisk > 0) {
    parts.push(
      atRisk === 1
        ? "1 paso sale con datos sin resolver"
        : `${atRisk} pasos salen con datos sin resolver`,
    );
  }
  return parts;
}

function BranchLabel({
  x,
  y,
  label,
  color,
}: Readonly<{ x: number; y: number; label: string; color: string }>) {
  return (
    <g>
      <rect
        x={x}
        y={y - 8}
        width={22}
        height={16}
        rx={8}
        fill="#ffffff"
        stroke={color}
      />
      <text
        x={x + 11}
        y={y + 3.5}
        textAnchor="middle"
        fontSize={9.5}
        fontWeight={700}
        fill={color}
      >
        {label}
      </text>
    </g>
  );
}
