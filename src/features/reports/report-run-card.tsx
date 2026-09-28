"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { useRunReportMutation } from "./hooks";
import {
  filledFilters,
  ReportFiltersForm,
  type ReportFilterValues,
} from "./report-filters-form";
import { ReportResult } from "./report-result";
import type { ReportFilter } from "./types";

/**
 * Calcular el informe.
 *
 * Había una confirmación que avisaba de que «la ejecución quedará registrada en auditoría» y el
 * resultado se enseñaba como JSON crudo. Calcular un informe sólo LEE: no cambia nada, así que no
 * necesita confirmación, y lo que devuelve son cifras con nombre que se pueden pintar como tales.
 */
export function ReportRunCard({
  reportId,
  filters,
}: Readonly<{ reportId: string; filters: ReportFilter[] }>) {
  const [values, setValues] = useState<ReportFilterValues>({});
  const runMutation = useRunReportMutation(reportId);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Calcular el informe"
          description="Se calcula en este momento sobre los datos actuales. No se guarda: si lo vuelves a calcular mañana, verás las cifras de mañana."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <PermissionGate permissions={["reporting.execute"]}>
          <ReportFiltersForm
            filters={filters}
            values={values}
            onChange={(key, value) =>
              setValues((current) => ({ ...current, [key]: value }))
            }
          />
          <Button
            variant="primary"
            disabled={runMutation.isPending}
            onClick={() => runMutation.mutate(filledFilters(values))}
          >
            {runMutation.isPending ? "Calculando…" : "Calcular"}
          </Button>
        </PermissionGate>
        {runMutation.error ? (
          <ErrorState
            description={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.message
                : "No se pudo calcular el informe."
            }
            requestId={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.requestId
                : undefined
            }
          />
        ) : null}
        {runMutation.data ? (
          <div className="space-y-3">
            <p className="text-xs text-atlas-muted">
              Calculado el {formatDateTime(runMutation.data.computedAt)}.
            </p>
            <ReportResult widgets={runMutation.data.widgets} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
