import type { StressLatencyPoint } from "./types";

export type LatencyStats = {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
};

export type LatencySample = {
  ok: boolean;
  latencyMs: number;
  elapsedMs: number;
};

export function latencyStats(values: number[]): LatencyStats {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  return {
    avg: Math.round(avg),
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    min: Math.round(sorted[0] ?? 0),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
  };
}

export function buildLatencyTimeline(
  samples: LatencySample[],
): StressLatencyPoint[] {
  const buckets = new Map<number, LatencySample[]>();
  samples.forEach((sample) => {
    const second = Math.floor(sample.elapsedMs / 1_000);
    buckets.set(second, [...(buckets.get(second) ?? []), sample]);
  });
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([second, bucket]) => {
      const stats = latencyStats(bucket.map((sample) => sample.latencyMs));
      return {
        second,
        count: bucket.length,
        errorCount: bucket.filter((sample) => !sample.ok).length,
        avgLatencyMs: stats.avg,
        p50LatencyMs: stats.p50,
        p95LatencyMs: stats.p95,
        maxLatencyMs: stats.max,
      };
    });
}

function percentile(sorted: number[], percentileValue: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil(sorted.length * percentileValue) - 1;
  return Math.round(sorted[Math.min(Math.max(index, 0), sorted.length - 1)]);
}
