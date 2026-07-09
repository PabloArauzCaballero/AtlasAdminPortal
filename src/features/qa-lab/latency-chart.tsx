import type { StressLatencyPoint } from "./types";

const WIDTH = 760;
const HEIGHT = 220;
const PADDING = 28;

export function StressLatencyChart({
  points,
}: Readonly<{ points?: StressLatencyPoint[] }>) {
  const safePoints = points?.filter((point) => point.count > 0) ?? [];
  if (safePoints.length === 0) return null;
  const maxLatency = Math.max(
    ...safePoints.map((point) => point.p95LatencyMs),
    1,
  );
  const maxSecond = Math.max(...safePoints.map((point) => point.second), 1);
  const path = buildPath(safePoints, maxSecond, maxLatency, "p95LatencyMs");
  const avgPath = buildPath(safePoints, maxSecond, maxLatency, "avgLatencyMs");
  return (
    <section className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-atlas-text">
            Evolución de latencia durante el stress
          </h3>
          <p className="text-xs text-atlas-muted">
            Cada punto agrupa las solicitudes terminadas por segundo.
          </p>
        </div>
        <Legend />
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-64 w-full">
        <Axis maxLatency={maxLatency} maxSecond={maxSecond} />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-blue-700"
        />
        <path
          d={avgPath}
          fill="none"
          stroke="currentColor"
          strokeDasharray="5 5"
          strokeWidth="2"
          className="text-slate-500"
        />
        {safePoints.map((point) => (
          <circle
            key={point.second}
            cx={x(point.second, maxSecond)}
            cy={y(point.p95LatencyMs, maxLatency)}
            r="3"
            className={point.errorCount > 0 ? "fill-red-600" : "fill-blue-700"}
          />
        ))}
      </svg>
    </section>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-atlas-muted">
      <span>línea sólida: p95</span>
      <span>línea punteada: promedio</span>
      <span>punto rojo: segundo con errores</span>
    </div>
  );
}

function Axis({
  maxLatency,
  maxSecond,
}: Readonly<{ maxLatency: number; maxSecond: number }>) {
  return (
    <g className="text-slate-300">
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        stroke="currentColor"
      />
      <line
        x1={PADDING}
        y1={PADDING}
        x2={PADDING}
        y2={HEIGHT - PADDING}
        stroke="currentColor"
      />
      <text x={PADDING} y={18} className="fill-slate-500 text-[11px]">
        {maxLatency} ms
      </text>
      <text
        x={WIDTH - 92}
        y={HEIGHT - 8}
        className="fill-slate-500 text-[11px]"
      >
        {maxSecond}s
      </text>
    </g>
  );
}

function buildPath(
  points: StressLatencyPoint[],
  maxSecond: number,
  maxLatency: number,
  key: "avgLatencyMs" | "p95LatencyMs",
): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${x(point.second, maxSecond)} ${y(point[key], maxLatency)}`;
    })
    .join(" ");
}

function x(second: number, maxSecond: number): number {
  const usableWidth = WIDTH - PADDING * 2;
  return PADDING + (second / maxSecond) * usableWidth;
}

function y(latency: number, maxLatency: number): number {
  const usableHeight = HEIGHT - PADDING * 2;
  return HEIGHT - PADDING - (latency / maxLatency) * usableHeight;
}
