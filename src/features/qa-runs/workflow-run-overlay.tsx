import type { GraphNode } from "@/features/workflows/workflow-graph-layout";
import { stepTone, stepTotal } from "./run-step-counts";
import type { QaRunStepCounts } from "./types";

const TONE_FILL = {
  passed: "#dcfce7",
  failed: "#fee2e2",
  mixed: "#fef3c7",
  none: "#f1f5f9",
} as const;
const TONE_INK = {
  passed: "#15803d",
  failed: "#b91c1c",
  mixed: "#b45309",
  none: "#475569",
} as const;

/**
 * Sobre cada nodo del árbol con resultados de la corrida: la distribución de TODAS las personas
 * en ese paso (una barra de proporciones y «aprobaron/fallaron/otros»), no un color único. Una
 * persona verde entre cien no vuelve verde el paso.
 */
export function RunCountsLayer({
  nodes,
  counts,
}: Readonly<{
  nodes: readonly GraphNode[];
  counts?: ReadonlyMap<string, QaRunStepCounts>;
}>) {
  if (!counts || counts.size === 0) return null;
  return (
    <g aria-hidden pointerEvents="none">
      {nodes.map((node) => {
        const step = counts.get(node.step.stepCode);
        if (!step) return null;
        const total = stepTotal(step);
        const tone = stepTone(step);
        const others = total - step.passed - step.failed;
        const width = 132;
        const x = node.x + node.width - width - 6;
        const y = node.y - 18;
        const bar = (value: number) =>
          total > 0 ? (value / total) * (width - 8) : 0;
        return (
          <g key={node.id} data-testid={`run-counts-${node.step.stepCode}`}>
            <rect
              x={x}
              y={y}
              width={width}
              height={22}
              rx={6}
              fill={TONE_FILL[tone]}
              stroke={TONE_INK[tone]}
              strokeWidth={0.8}
            />
            <text
              x={x + 6}
              y={y + 10}
              fontSize={8.5}
              fontWeight={700}
              fill={TONE_INK[tone]}
            >
              {`✓ ${step.passed} · ✗ ${step.failed} · otros ${others}`}
            </text>
            <rect
              x={x + 4}
              y={y + 15}
              width={width - 8}
              height={3}
              rx={1.5}
              fill="#e2e8f0"
            />
            <rect
              x={x + 4}
              y={y + 15}
              width={bar(step.passed)}
              height={3}
              fill="#10b981"
            />
            <rect
              x={x + 4 + bar(step.passed)}
              y={y + 15}
              width={bar(step.failed)}
              height={3}
              fill="#ef4444"
            />
          </g>
        );
      })}
    </g>
  );
}
