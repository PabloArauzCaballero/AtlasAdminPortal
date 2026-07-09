import type { ReadyItem, ReadyStatus } from "./readiness-types";

export type ReleaseReadinessStatus = "ready" | "warning" | "blocked";
export type ReleaseReadinessCheckStatus = "ok" | "warning" | "blocked";

export type ServerReleaseReadinessCheck = {
  key: string;
  label: string;
  status: ReleaseReadinessCheckStatus;
  details?: Record<string, unknown>;
  detail?: string;
};

export type ServerReleaseReadiness = {
  status: ReleaseReadinessStatus;
  checks: ServerReleaseReadinessCheck[];
  blockers?: unknown[];
  warnings?: unknown[];
  generatedAt?: string;
};

export type ReleaseReadinessView = {
  status: ReleaseReadinessStatus;
  checks: ReadyItem[];
  blockers: number;
  warnings: number;
  generatedAt?: string;
};

export function toReadyStatus(
  status: ReleaseReadinessCheckStatus,
): ReadyStatus {
  if (status === "ok") return "OK";
  if (status === "blocked") return "BLOCKED";
  return "NEEDS_REVIEW";
}
