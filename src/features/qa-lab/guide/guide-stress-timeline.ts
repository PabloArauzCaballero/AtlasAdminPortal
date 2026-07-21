// Datos y geometría del gráfico de stress de la guía. Separado del componente
// para mantener el archivo de UI por debajo del límite de líneas del repo y
// poder testear la generación/escalado sin montar React.

export const WIDTH = 760;
export const HEIGHT = 220;
export const PADDING = 28;
export const BAR_MAX_HEIGHT = 46;
export const TOTAL_SECONDS = 30;
export const TICK_MS = 120;

export type GuidePoint = {
  second: number;
  count: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorCount: number;
};

// Timeline sintético y determinista: rampa de subida, meseta con saturación
// tardía y errores al final. No golpea ningún backend — es solo didáctico.
export function buildDemoTimeline(): GuidePoint[] {
  const points: GuidePoint[] = [];
  for (let second = 0; second <= TOTAL_SECONDS; second += 1) {
    const ramp = Math.min(1, second / 6);
    const saturation = Math.max(0, (second - 14) / (TOTAL_SECONDS - 14));
    const count = Math.round(4 + ramp * 46 + Math.sin(second * 1.3) * 3);
    const avg = 40 + ramp * 60 + saturation * 140 + Math.sin(second * 0.9) * 8;
    const p95 = avg * (1.6 + saturation * 1.1) + Math.sin(second * 1.7) * 14;
    const errorCount = second >= 24 ? Math.round((second - 23) * 1.6) : 0;
    points.push({
      second,
      count,
      avgLatencyMs: Math.round(avg),
      p95LatencyMs: Math.round(p95),
      errorCount,
    });
  }
  return points;
}

export function buildPath(
  points: GuidePoint[],
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

export function x(second: number, maxSecond: number): number {
  const usableWidth = WIDTH - PADDING * 2;
  return PADDING + (second / maxSecond) * usableWidth;
}

export function y(latency: number, maxLatency: number): number {
  const usableHeight = HEIGHT - PADDING * 2;
  return HEIGHT - PADDING - (latency / maxLatency) * usableHeight;
}
