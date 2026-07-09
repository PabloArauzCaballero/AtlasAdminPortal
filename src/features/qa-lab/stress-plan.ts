import type { DirectStressInput } from "./types";

export const HARD_MAX_STRESS_REQUESTS = 10_000;

export type StressPlan = {
  requestedTargetRps: number;
  targetRps: number;
  durationSeconds: number;
  concurrency: number;
  rampUpSeconds: number;
  maxRequests: number;
  plannedRequests: number;
  totalRequests: number;
  intervalMs: number;
};

export function normalizeStressPlan(input: DirectStressInput): StressPlan {
  const requestedTargetRps = clamp(input.targetRps, 1, 500);
  const durationSeconds = clamp(input.durationSeconds, 1, 3_600);
  const concurrency = clamp(input.concurrency, 1, 200);
  const rampUpSeconds = clamp(input.rampUpSeconds, 0, durationSeconds);
  const maxRequests = clamp(input.maxRequests, 1, HARD_MAX_STRESS_REQUESTS);
  const plannedRequests = Math.max(
    1,
    Math.round(requestedTargetRps * durationSeconds),
  );
  const totalRequests = Math.min(plannedRequests, maxRequests);
  return {
    requestedTargetRps,
    targetRps: requestedTargetRps,
    durationSeconds,
    concurrency,
    rampUpSeconds,
    maxRequests,
    plannedRequests,
    totalRequests,
    intervalMs: Math.max(2, Math.round(1000 / requestedTargetRps)),
  };
}

export function buildStressWarnings(
  input: DirectStressInput,
  unresolvedPathParams: string[],
): string[] {
  const warnings: string[] = [];
  if (unresolvedPathParams.length > 0) {
    warnings.push(
      `Path params pendientes: ${unresolvedPathParams.join(", ")}.`,
    );
  }
  if (input.targetRps * input.durationSeconds > input.maxRequests) {
    warnings.push(
      `Plan recortado al maximo configurado de ${input.maxRequests} requests.`,
    );
  }
  if (input.maxRequests > HARD_MAX_STRESS_REQUESTS) {
    warnings.push(
      `Plan recortado al maximo seguro de ${HARD_MAX_STRESS_REQUESTS} requests.`,
    );
  }
  if (!input.dryRun && !input.approvalTicket) {
    warnings.push("Stress real sin ticket sera bloqueado por seguridad.");
  }
  return warnings;
}

export async function runPacedRequests(
  plan: StressPlan,
  task: () => Promise<void>,
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (let index = 0; index < plan.totalRequests; index += 1) {
    const promise = task().finally(() => executing.delete(promise));
    executing.add(promise);
    if (executing.size >= plan.concurrency) await Promise.race(executing);
    if (index < plan.totalRequests - 1) await sleep(delayForIndex(plan, index));
  }
  await Promise.allSettled(executing);
}

function delayForIndex(plan: StressPlan, index: number): number {
  if (plan.rampUpSeconds <= 0) return plan.intervalMs;
  const elapsedSeconds = index / plan.targetRps;
  if (elapsedSeconds >= plan.rampUpSeconds) return plan.intervalMs;
  const progress = Math.max(elapsedSeconds / plan.rampUpSeconds, 0.05);
  const currentRps = Math.max(1, plan.targetRps * progress);
  return Math.max(plan.intervalMs, Math.round(1000 / currentRps));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
