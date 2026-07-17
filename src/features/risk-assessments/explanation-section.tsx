"use client";

import { isAtlasApiError } from "@/shared/api/errors";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badges";
import { SectionHeader } from "@/shared/components/layout/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { safeText } from "@/shared/lib/format";
import { useRiskAssessmentExplanation } from "./hooks";
import type { RiskExplanationFactor } from "./types";

function FactorList({
  factors,
  impact,
}: Readonly<{
  factors: RiskExplanationFactor[];
  impact: "positive" | "negative";
}>) {
  if (factors.length === 0) {
    return (
      <p className="text-sm text-atlas-muted">
        Sin factores registrados en esta categoría.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {factors.map((factor) => (
        <li
          key={`${factor.code}-${factor.label}`}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-atlas-border bg-white px-3 py-2"
        >
          <Badge tone={impact === "positive" ? "success" : "critical"}>
            {impact === "positive" ? "A favor" : "En contra"}
          </Badge>
          <span className="font-mono text-xs text-atlas-text">
            {safeText(factor.code)}
          </span>
          <span className="text-sm text-atlas-muted">
            {safeText(factor.label)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ExplanationSection({ runId }: Readonly<{ runId: string }>) {
  const explanation = useRiskAssessmentExplanation(runId);
  // El backend responde 404 cuando la corrida existe pero aún no tiene
  // resultado. No es un error de carga: es un estado legítimo del flujo, así
  // que se separa del error real para no alarmar al analista sin motivo.
  const isMissingResult =
    isAtlasApiError(explanation.error) && explanation.error.status === 404;
  const hasRealError = Boolean(explanation.error) && !isMissingResult;

  return (
    <section className="mb-6">
      <SectionHeader
        title="Explicación de la decisión"
        description="Por qué el sistema recomendó esta acción, en lenguaje del analista."
      />
      {explanation.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {isMissingResult ? (
        <EmptyState
          title="Esta evaluación todavía no tiene explicación."
          description="La corrida existe pero no registró un resultado, así que no hay decisión que explicar. Revisá el detalle crudo más abajo para ver en qué estado quedó."
        />
      ) : null}
      {hasRealError ? (
        <ErrorState
          description={
            isAtlasApiError(explanation.error)
              ? explanation.error.message
              : "No se pudo cargar la explicación de la evaluación."
          }
          requestId={
            isAtlasApiError(explanation.error)
              ? explanation.error.requestId
              : undefined
          }
          onRetry={() => void explanation.refetch()}
        />
      ) : null}
      {explanation.data ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-atlas-text">
                Decisión recomendada
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="info">
                  {safeText(explanation.data.recommendedAction)}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-atlas-text">
                {safeText(explanation.data.summary)}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-atlas-text">
                  Factores a favor
                </h3>
              </CardHeader>
              <CardContent>
                <FactorList
                  factors={explanation.data.topPositiveFactors}
                  impact="positive"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-atlas-text">
                  Factores en contra
                </h3>
              </CardHeader>
              <CardContent>
                <FactorList
                  factors={explanation.data.topNegativeFactors}
                  impact="negative"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-atlas-text">
                Reglas disparadas
              </h3>
            </CardHeader>
            <CardContent>
              {explanation.data.rulesFired.length === 0 ? (
                <p className="text-sm text-atlas-muted">
                  La evaluación no disparó reglas explicativas.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {explanation.data.rulesFired.map((rule) => (
                    <Badge key={rule} tone="warning">
                      {rule}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
