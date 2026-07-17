"use client";

import { isAtlasApiError } from "@/shared/api/errors";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Badge, RiskBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { AuditTrailTabs } from "./audit-trail-tabs";
import { ExplanationSection } from "./explanation-section";
import { useRiskAssessment } from "./hooks";
import type { RiskAssessmentDetail } from "./types";

function ResultMetrics({ detail }: Readonly<{ detail: RiskAssessmentDetail }>) {
  const { result } = detail;
  if (!result) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-subtle">
        <h2 className="text-sm font-semibold">
          Esta corrida todavía no tiene resultado.
        </h2>
        <p className="mt-1 text-sm text-amber-800">
          No hay decisión ni scores registrados: la evaluación quedó en estado{" "}
          <span className="font-mono">
            {detail.run.runStatus ?? "desconocido"}
          </span>
          . El detalle de la corrida sigue disponible como traza de auditoría.
        </p>
      </div>
    );
  }
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Score total" value={formatNumber(result.scoreTotal)} />
      <MetricCard
        label="Score de fraude"
        value={formatNumber(result.fraudScore)}
      />
      <MetricCard
        label="Score de identidad"
        value={formatNumber(result.identityScore)}
      />
      <MetricCard
        label="Decidido"
        value={formatDateTime(result.decidedAt)}
        hint={result.modelVersionCodeSnapshot ?? undefined}
      />
    </div>
  );
}

export function RiskAssessmentDetailPage({
  riskAssessmentRunId,
}: Readonly<{ riskAssessmentRunId: string }>) {
  const detail = useRiskAssessment(riskAssessmentRunId);

  return (
    <div>
      <PageHeader
        eyebrow="Operaciones"
        title={`Evaluación de riesgo #${riskAssessmentRunId}`}
        description="Por qué el sistema decidió lo que decidió, y la traza completa que lo respalda."
        actions={
          detail.data?.result ? (
            <>
              <RiskBadge value={detail.data.result.riskLevel} />
              <Badge tone="info">
                {detail.data.result.recommendedAction ?? "Sin acción"}
              </Badge>
            </>
          ) : null
        }
      />

      {detail.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {detail.error ? (
        <ErrorState
          description={
            isAtlasApiError(detail.error)
              ? detail.error.message
              : "No se pudo cargar la evaluación de riesgo."
          }
          requestId={
            isAtlasApiError(detail.error) ? detail.error.requestId : undefined
          }
          onRetry={() => void detail.refetch()}
        />
      ) : null}
      {detail.data ? (
        <>
          <ResultMetrics detail={detail.data} />
          {/* La explicación se consulta aparte: puede fallar (404 sin resultado)
              sin que eso invalide el detalle crudo que ya cargó. */}
          <ExplanationSection runId={riskAssessmentRunId} />
          <SectionHeader
            title="Traza de auditoría"
            description="Los datos crudos que respaldan la decisión: corrida, resultado, reglas, contribuciones y snapshot de features."
          />
          <AuditTrailTabs detail={detail.data} />
        </>
      ) : null}
    </div>
  );
}
