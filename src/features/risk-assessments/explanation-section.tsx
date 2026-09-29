"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { isAtlasApiError } from "@/shared/api/errors";
import { SectionTable } from "@/shared/components/data-table/section-table";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badges";
import { SectionHeader } from "@/shared/components/layout/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { safeText } from "@/shared/lib/format";
import { decidioElMotor } from "./decision-provenance";
import { useRiskAssessmentExplanation } from "./hooks";
import type { RiskExplanationFactor } from "./types";

type FilaFactor = RiskExplanationFactor & { impact: "positive" | "negative" };

const COLUMNAS_FACTORES: ColumnDef<FilaFactor>[] = [
  {
    header: "Impacto",
    accessorKey: "impact",
    cell: ({ row }) => (
      <Badge tone={row.original.impact === "positive" ? "success" : "critical"}>
        {row.original.impact === "positive" ? "A favor" : "En contra"}
      </Badge>
    ),
  },
  {
    header: "Código",
    accessorKey: "code",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{safeText(row.original.code)}</span>
    ),
  },
  {
    header: "Qué mide",
    accessorKey: "label",
    cell: ({ row }) => safeText(row.original.label),
  },
];

/** Factores a favor y en contra juntos: una sola tabla en la que se compara su peso relativo. */
function filasDeFactores(
  positivos: RiskExplanationFactor[],
  negativos: RiskExplanationFactor[],
): FilaFactor[] {
  return [
    ...positivos.map((factor) => ({ ...factor, impact: "positive" as const })),
    ...negativos.map((factor) => ({ ...factor, impact: "negative" as const })),
  ];
}

export function ExplanationSection({
  runId,
  decisionSource,
}: Readonly<{ runId: string; decisionSource: string | null }>) {
  const explanation = useRiskAssessmentExplanation(runId);
  // Cuando decidió el Motor, esto es contexto y no explicación: lo dice el encabezado, y lo dice
  // otra vez sobre las reglas, que es donde más fácil sería leerlo como el motivo del rechazo.
  const esContexto = decidioElMotor(decisionSource);
  // El backend responde 404 cuando la corrida existe pero aún no tiene
  // resultado. No es un error de carga: es un estado legítimo del flujo, así
  // que se separa del error real para no alarmar al analista sin motivo.
  const isMissingResult =
    isAtlasApiError(explanation.error) && explanation.error.status === 404;
  const hasRealError = Boolean(explanation.error) && !isMissingResult;

  return (
    <section className="mb-6">
      <SectionHeader
        title={
          esContexto
            ? "Contexto que calculó Atlas"
            : "Explicación de la decisión"
        }
        description={
          esContexto
            ? "Esta decisión la tomó el Motor: lo de abajo es lo que Atlas midió del cliente, no el motivo por el que se decidió. La explicación está en la ejecución del Motor."
            : "Por qué el sistema recomendó esta acción, en lenguaje del analista."
        }
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
                {esContexto ? "Decisión registrada" : "Decisión recomendada"}
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

          <SectionTable
            title="Factores de la decisión"
            description="Lo que más pesó a favor y en contra, ordenado como lo devolvió el sistema."
            data={filasDeFactores(
              explanation.data.topPositiveFactors,
              explanation.data.topNegativeFactors,
            )}
            columns={COLUMNAS_FACTORES}
            searchText={(factor) =>
              `${factor.code} ${factor.label} ${factor.impact === "positive" ? "a favor" : "en contra"}`
            }
            searchPlaceholder="Buscar por código, descripción o impacto…"
            searchTooltip="Recorre todos los factores de esta evaluación, a favor y en contra, que llegan enteros con la explicación: coincide con parte del código, de la descripción o del impacto."
            emptyTitle="Sin factores registrados."
            emptyDescription="La evaluación no dejó factores a favor ni en contra."
          />

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-atlas-text">
                Reglas disparadas
              </h3>
            </CardHeader>
            <CardContent>
              {esContexto ? (
                <p className="mb-2 text-xs text-atlas-muted">
                  Reglas de la política LOCAL. No son las que aplicó el Motor.
                </p>
              ) : null}
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
