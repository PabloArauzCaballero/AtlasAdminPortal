import type { ReadyItem, ReadyStatus } from "./readiness-types";

export function statusFromScore(
  value: number,
  warning: number,
  blocked: number,
  inverse = false,
): ReadyStatus {
  if (inverse) {
    if (value >= blocked) return "BLOCKED";
    if (value >= warning) return "NEEDS_REVIEW";
    return "OK";
  }
  if (value <= blocked) return "BLOCKED";
  if (value <= warning) return "NEEDS_REVIEW";
  return "OK";
}

export function statusScore(status: ReadyStatus) {
  return status === "OK" ? 1 : status === "NEEDS_REVIEW" ? 0.5 : 0;
}

export function calculateReadinessScore(items: ReadyItem[]) {
  if (!items.length) return 0;
  const score = items.reduce((sum, item) => sum + statusScore(item.status), 0);
  return Math.round((score / items.length) * 100);
}
