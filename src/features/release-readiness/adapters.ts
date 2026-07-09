import type { ReadyItem } from "./readiness-types";
import type {
  ReleaseReadinessView,
  ServerReleaseReadiness,
} from "./server-types";
import { toReadyStatus } from "./server-types";

export function toReadinessView(
  payload: ServerReleaseReadiness,
): ReleaseReadinessView {
  const checks: ReadyItem[] = payload.checks.map((check) => ({
    key: check.key,
    label: check.label,
    status: toReadyStatus(check.status),
    detail: check.detail ?? formatDetails(check.details),
  }));

  return {
    status: payload.status,
    checks,
    blockers: payload.blockers?.length ?? countChecks(checks, "BLOCKED"),
    warnings: payload.warnings?.length ?? countChecks(checks, "NEEDS_REVIEW"),
    generatedAt: payload.generatedAt,
  };
}

function countChecks(items: ReadyItem[], status: ReadyItem["status"]) {
  return items.filter((item) => item.status === status).length;
}

function formatDetails(details?: Record<string, unknown>) {
  if (!details) return "Sin detalle adicional.";
  return Object.entries(details)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}
