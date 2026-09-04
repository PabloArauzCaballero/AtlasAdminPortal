"use client";

import Link from "next/link";
import { RiskBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import type { InvestigationSummary } from "./types";

/**
 * La última evaluación de riesgo, con el enlace a su traza.
 *
 * El enlace al `run` es lo que convierte un puntaje en algo discutible: sin él, la pantalla afirma
 * un número y quien decide no tiene forma de ver de dónde salió.
 */
export function UltimaEvaluacionDeRiesgo({
  evaluacion,
}: Readonly<{ evaluacion: InvestigationSummary["latestRiskAssessment"] }>) {
  return (
    <section className="rounded-2xl border border-atlas-border bg-white shadow-subtle">
      <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-4">
        <h2 className="text-sm font-semibold text-atlas-text">
          Última evaluación de riesgo
        </h2>
      </div>
      <div className="p-5">
        {evaluacion ? (
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge value={evaluacion.riskLevel} />
            <span className="text-sm text-atlas-text">
              {safeText(evaluacion.recommendedAction)}
            </span>
            <span className="text-sm text-atlas-muted">
              Score: {formatNumber(evaluacion.fraudScore)}
            </span>
            <Link
              href={`/internal/operations/risk-assessments/${evaluacion.riskAssessmentRunId}`}
              className="ml-auto font-mono text-xs text-atlas-accent underline"
            >
              run #{evaluacion.riskAssessmentRunId}
            </Link>
            <span className="w-full text-xs text-atlas-muted">
              Decidido: {formatDateTime(evaluacion.decidedAt)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-atlas-muted">
            Sin evaluaciones de riesgo registradas.
          </p>
        )}
      </div>
    </section>
  );
}
