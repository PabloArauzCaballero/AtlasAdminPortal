"use client";

import { useMemo, useState } from "react";
import {
  useDataQualityIssues,
  useResolveDataQualityIssueMutation,
} from "@/features/operations/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { buildIssueColumns, isAcknowledgedIssue } from "./issue-columns";
import { ISSUE_STATUS_OPTIONS, SEVERITY_OPTIONS } from "./quality-options";
import { ResolutionDialog } from "./resolution-dialog";
import type { ResolutionForm } from "./resolution-schema";
import type { DataQualityIssue } from "@/features/operations/types";
import { TriangleAlert } from "lucide-react";

export function DataQualityIssuesPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["dataQuality.issues.read"]}>
      <AuthorizedDataQualityIssuesPage />
    </PermissionGate>
  );
}

/**
 * La ÚNICA bandeja de incidencias de calidad. Absorbe la antigua «Alertas» (`/internal/alerts`), que
 * leía la misma tabla: allí «Reconocer» cerraba sin motivo y después «Cerrar» respondía 409. Ahora
 * reconocer es una resolución más del diálogo, con motivo y notas, y deja la incidencia pendiente.
 *
 * El buscador viaja como `q` (tabla, código de regla y notas); antes mandaba `entityType`, que es
 * igualdad exacta con la tabla. Las tarjetas salen del `summary` del servidor, no de la página.
 */
function AuthorizedDataQualityIssuesPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  // La página sólo recuerda QUÉ incidencia se está resolviendo; los campos
  // (resolución, motivo, notas) viven en el formulario del diálogo.
  const [activeIssue, setActiveIssue] = useState<DataQualityIssue | null>(null);
  const issues = useDataQualityIssues({ page, limit: 20, q, status, severity });
  const resolveMutation = useResolveDataQualityIssueMutation();
  const items = issues.data?.items ?? [];
  const summary = issues.data?.summary;
  const columns = useMemo(() => buildIssueColumns(setActiveIssue), []);
  const filtered = Boolean(q || status || severity);

  function submitResolution(values: ResolutionForm) {
    if (!activeIssue) return;
    resolveMutation.mutate(
      { issueId: activeIssue.issueId, body: values },
      { onSuccess: () => setActiveIssue(null) },
    );
  }

  return (
    <>
      <PageHeader
        icon={TriangleAlert}
        eyebrow="Calidad de datos"
        title="Issues de calidad"
        description="Registros que no cumplen una regla de calidad: reconócelos, corrígelos o descártalos, siempre con motivo."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por tabla, código de regla o notas…"
        searchTooltip="Busca el texto dentro de la tabla del registro, el código de la regla o las notas de la resolución."
        filters={[
          {
            name: "status",
            label: "Estado",
            tooltip:
              "Sin revisar y reconocidas siguen pendientes; corregidas y descartadas están cerradas.",
            value: status,
            options: ISSUE_STATUS_OPTIONS,
          },
          {
            name: "severity",
            label: "Severidad",
            tooltip: "La gravedad de la regla que levantó la incidencia.",
            value: severity,
            options: SEVERITY_OPTIONS,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "severity") setSeverity(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("");
          setSeverity("");
          setPage(1);
        }}
      />
      {issues.error ? (
        <ErrorState
          description={
            isAtlasApiError(issues.error)
              ? issues.error.message
              : "No se pudieron cargar las incidencias de calidad."
          }
          requestId={
            isAtlasApiError(issues.error) ? issues.error.requestId : undefined
          }
          onRetry={() => void issues.refetch()}
        />
      ) : null}
      <div className="space-y-6">
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Pendientes"
            value={formatNumber(summary?.pending)}
          />
          <MetricCard
            label="Sin revisar"
            value={formatNumber(summary?.unreviewed)}
          />
          <MetricCard
            label="Reconocidas sin corregir"
            value={formatNumber(summary?.acknowledged)}
          />
          <MetricCard label="Cerradas" value={formatNumber(summary?.closed)} />
        </section>
        <Card>
          <CardHeader>
            <SectionHeader
              title="Bandeja de calidad"
              description="Las más recientes primero. Las pendientes cuentan en la preparación de salida."
              className="mb-0"
            />
          </CardHeader>
          <CardContent>
            {issues.isLoading ? <LoadingSkeleton rows={6} /> : null}
            {issues.data ? (
              <DataTable
                data={items}
                columns={columns}
                meta={issues.data.meta}
                onPageChange={setPage}
                emptyTitle={
                  filtered
                    ? "No hay incidencias para los filtros actuales."
                    : "No hay incidencias de calidad registradas."
                }
                emptyDescription={
                  filtered
                    ? "Prueba a quitar algún filtro."
                    : "Hoy ningún proceso las crea solo: las reglas existen, pero todavía no se evalúan de forma automática."
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
      {activeIssue ? (
        <ResolutionDialog
          // Remonta al cambiar de incidencia: el formulario arranca limpio.
          key={activeIssue.issueId}
          issueId={activeIssue.issueId}
          acknowledged={isAcknowledgedIssue(activeIssue)}
          isLoading={resolveMutation.isPending}
          error={resolveMutation.error}
          onCancel={() => setActiveIssue(null)}
          onSubmit={submitResolution}
        />
      ) : null}
    </>
  );
}
