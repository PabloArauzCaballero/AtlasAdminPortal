import { buildLatencyTimeline, latencyStats } from "./latency-stats";
import { redactedHeaders } from "./qa-safety";
import { sanitizeQaValue } from "./response-sanitizer";
import { type StressPlan } from "./stress-plan";
import type { DirectStressInput, DirectStressResult } from "./types";

export type StressRequestSample = {
  ok: boolean;
  latencyMs: number;
  elapsedMs: number;
  statusKey: string;
};

export function dryRunStressResult(
  built: BuiltRequestLike,
  plan: StressPlan,
  warnings: string[],
): DirectStressResult {
  return {
    url: built.url,
    method: built.method,
    dryRun: true,
    totalRequests: plan.totalRequests,
    successCount: 0,
    errorCount: 0,
    avgLatencyMs: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    minLatencyMs: 0,
    maxLatencyMs: 0,
    errorRate: 0,
    throughputRps: 0,
    requestedTargetRps: plan.requestedTargetRps,
    plannedRequests: plan.plannedRequests,
    durationMs: plan.durationSeconds * 1_000,
    capped: plan.plannedRequests > plan.totalRequests,
    statusCounts: {},
    requestHeaders: redactedHeaders(built.headers),
    warnings,
    thresholds: [],
    latencyTimeline: [],
  };
}

export function buildStressResult(
  input: BuildStressResultInput,
): DirectStressResult {
  const stats = latencyStats(input.samples.map((sample) => sample.latencyMs));
  const counters = countSamples(input.samples);
  const errorRate = counters.total ? counters.errorCount / counters.total : 0;
  const throughputRps = throughput(counters.total, input.durationMs);
  return {
    url: input.built.url,
    method: input.built.method,
    dryRun: false,
    totalRequests: counters.total,
    successCount: counters.successCount,
    errorCount: counters.errorCount,
    avgLatencyMs: stats.avg,
    p50LatencyMs: stats.p50,
    p95LatencyMs: stats.p95,
    p99LatencyMs: stats.p99,
    minLatencyMs: stats.min,
    maxLatencyMs: stats.max,
    errorRate,
    throughputRps,
    requestedTargetRps: input.plan.requestedTargetRps,
    plannedRequests: input.plan.plannedRequests,
    durationMs: input.durationMs,
    capped: input.plan.plannedRequests > input.plan.totalRequests,
    statusCounts: sanitizeQaValue(counters.statusCounts) as Record<
      string,
      number
    >,
    requestHeaders: redactedHeaders(input.built.headers),
    warnings: input.warnings,
    thresholds: evaluateThresholds(
      input.input,
      errorRate,
      stats,
      throughputRps,
    ),
    latencyTimeline: buildLatencyTimeline(input.samples),
  };
}

function countSamples(samples: StressRequestSample[]): SampleCounters {
  return samples.reduce<SampleCounters>(
    (acc, sample) => {
      acc.total += 1;
      acc.statusCounts[sample.statusKey] =
        (acc.statusCounts[sample.statusKey] ?? 0) + 1;
      if (sample.ok) acc.successCount += 1;
      else acc.errorCount += 1;
      return acc;
    },
    { total: 0, successCount: 0, errorCount: 0, statusCounts: {} },
  );
}

function evaluateThresholds(
  input: DirectStressInput,
  errorRate: number,
  stats: ReturnType<typeof latencyStats>,
  throughputRps: number,
) {
  return [
    input.maxErrorRate === undefined
      ? null
      : {
          name: "Error rate",
          passed: errorRate <= input.maxErrorRate,
          expected: `<= ${(input.maxErrorRate * 100).toFixed(1)}%`,
          actual: `${(errorRate * 100).toFixed(1)}%`,
        },
    input.maxP95Ms === undefined
      ? null
      : {
          name: "p95 latency",
          passed: stats.p95 <= input.maxP95Ms,
          expected: `<= ${input.maxP95Ms} ms`,
          actual: `${stats.p95} ms`,
        },
    input.maxAvgMs === undefined
      ? null
      : {
          name: "Avg latency",
          passed: stats.avg <= input.maxAvgMs,
          expected: `<= ${input.maxAvgMs} ms`,
          actual: `${stats.avg} ms`,
        },
    input.maxP99Ms === undefined
      ? null
      : {
          name: "p99 latency",
          passed: stats.p99 <= input.maxP99Ms,
          expected: `<= ${input.maxP99Ms} ms`,
          actual: `${stats.p99} ms`,
        },
    input.minThroughputRps === undefined
      ? null
      : {
          name: "Throughput minimo",
          passed: throughputRps >= input.minThroughputRps,
          expected: `>= ${input.minThroughputRps} rps`,
          actual: `${throughputRps} rps`,
        },
  ].filter((item): item is NonNullable<typeof item> => item !== null);
}

function throughput(total: number, durationMs: number): number {
  return durationMs > 0 ? Number((total / (durationMs / 1000)).toFixed(2)) : 0;
}

type BuiltRequestLike = {
  url: string;
  method: string;
  headers: Record<string, string>;
};

type SampleCounters = {
  total: number;
  successCount: number;
  errorCount: number;
  statusCounts: Record<string, number>;
};

type BuildStressResultInput = {
  built: BuiltRequestLike;
  input: DirectStressInput;
  plan: StressPlan;
  samples: StressRequestSample[];
  durationMs: number;
  warnings: string[];
};
