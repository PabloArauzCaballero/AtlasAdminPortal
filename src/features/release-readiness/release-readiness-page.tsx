"use client";

import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";
import { calculateReadinessScore } from "./readiness-score";
import { ReadinessActions, ReadinessChecklist } from "./readiness-checklist";
import { toReadinessView } from "./adapters";
import { useReleaseReadiness } from "./hooks";

export function ReleaseReadinessPage() {
  const readinessQuery = useReleaseReadiness();
  const view = readinessQuery.data
    ? toReadinessView(readinessQuery.data)
    : null;
  const score = view ? calculateReadinessScore(view.checks) : 0;

  return (
    <PermissionGate permissions={["reporting.read"]}>
      <PageHeader
        eyebrow="Readiness"
        title="Readiness operativo para releases"
        description="Semáforo auditable calculado por el servicio interno. El portal ya no calcula readiness crítico en navegador."
      />
      {readinessQuery.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {readinessQuery.error ? (
        <ErrorState
          description={
            isAtlasApiError(readinessQuery.error)
              ? readinessQuery.error.message
              : "No se pudo cargar readiness."
          }
          requestId={
            isAtlasApiError(readinessQuery.error)
              ? readinessQuery.error.requestId
              : undefined
          }
          onRetry={() => void readinessQuery.refetch()}
        />
      ) : null}
      {view ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Score readiness" value={`${score}%`} />
            <MetricCard label="Estado" value={safeText(view.status)} />
            <MetricCard
              label="Bloqueantes"
              value={formatNumber(view.blockers)}
            />
            <MetricCard
              label="Advertencias"
              value={formatNumber(view.warnings)}
            />
          </section>
          <ReadinessChecklist items={view.checks} />
          <ReadinessActions />
        </div>
      ) : null}
    </PermissionGate>
  );
}
