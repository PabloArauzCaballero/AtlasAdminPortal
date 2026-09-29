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
import { ReportsReadinessPage } from "@/features/reports-readiness/reports-readiness-page";
import { Rocket } from "lucide-react";

const ESTADO_PREPARACION: Record<string, string> = {
  ready: "Listo",
  warning: "Con avisos",
  blocked: "Bloqueado",
};

export function ReleaseReadinessPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["reporting.read"]}>
      <AuthorizedReleaseReadinessPage />
    </PermissionGate>
  );
}

function AuthorizedReleaseReadinessPage() {
  const readinessQuery = useReleaseReadiness();
  const view = readinessQuery.data
    ? toReadinessView(readinessQuery.data)
    : null;
  const score = view ? calculateReadinessScore(view.checks) : 0;

  return (
    <>
      <PageHeader
        icon={Rocket}
        eyebrow="Preparación"
        title="Preparación para publicar"
        description="El semáforo de lo que falta antes de publicar una nueva versión y de la información que necesitan los informes."
      />
      {readinessQuery.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {readinessQuery.error ? (
        <ErrorState
          description={
            isAtlasApiError(readinessQuery.error)
              ? readinessQuery.error.message
              : "No se pudo cargar el estado de preparación."
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
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Puntuación de preparación" value={`${score}%`} />
            <MetricCard
              label="Estado"
              value={ESTADO_PREPARACION[view.status] ?? safeText(view.status)}
            />
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
          <ReportsReadinessPage embedded />
        </div>
      ) : null}
    </>
  );
}
