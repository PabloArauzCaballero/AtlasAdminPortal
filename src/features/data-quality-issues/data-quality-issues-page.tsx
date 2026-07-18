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
import { buildIssueColumns } from "./issue-columns";
import { ResolutionDialog } from "./resolution-dialog";
import type { ResolutionForm } from "./resolution-schema";
import type { DataQualityIssue } from "@/features/operations/types";

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

function AuthorizedDataQualityIssuesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [entityType, setEntityType] = useState("");
  // La página solo recuerda QUÉ issue se está cerrando; los campos del cierre
  // (resolución, motivo, notas) viven en el formulario del diálogo (rhf + Zod).
  const [activeIssue, setActiveIssue] = useState<DataQualityIssue | null>(null);
  const issues = useDataQualityIssues({
    page,
    limit: 20,
    status,
    severity,
    entityType,
  });
  const resolveMutation = useResolveDataQualityIssueMutation();
  const items = issues.data?.items ?? [];
  const columns = useMemo(() => buildIssueColumns(setActiveIssue), []);

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
        eyebrow="Calidad de datos"
        title="Issues de calidad de datos"
        description="Bandeja conectada a `/operations/data-quality/issues`. La resolución se maneja en componentes pequeños y auditables."
      />
      <QualityFilters
        entityType={entityType}
        status={status}
        severity={severity}
        onEntityTypeChange={(value) => {
          setEntityType(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "severity") setSeverity(value);
          setPage(1);
        }}
        onClear={() => {
          setEntityType("");
          setStatus("");
          setSeverity("");
          setPage(1);
        }}
      />
      {issues.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {issues.error ? (
        <QualityError
          error={issues.error}
          onRetry={() => void issues.refetch()}
        />
      ) : null}
      {issues.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Issues visibles"
              value={formatNumber(items.length)}
            />
            <MetricCard
              label="Abiertos"
              value={formatNumber(items.filter((i) => !i.resolvedAt).length)}
            />
            <MetricCard
              label="Cerrados"
              value={formatNumber(items.filter((i) => i.resolvedAt).length)}
            />
            <MetricCard
              label="Total consulta"
              value={formatNumber(issues.data.meta.total)}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Bandeja de calidad"
                description="Los filtros son del contrato real de DataQualityController."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={items}
                columns={columns}
                meta={issues.data.meta}
                onPageChange={setPage}
                emptyTitle="No hay issues de calidad para los filtros actuales."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
      {activeIssue ? (
        <ResolutionDialog
          // Remonta al cambiar de issue: el form del diálogo arranca limpio.
          key={activeIssue.issueId}
          issueId={activeIssue.issueId}
          isLoading={resolveMutation.isPending}
          error={resolveMutation.error}
          onCancel={() => setActiveIssue(null)}
          onSubmit={submitResolution}
        />
      ) : null}
    </>
  );
}

function QualityFilters(
  props: Readonly<{
    entityType: string;
    status: string;
    severity: string;
    onEntityTypeChange: (value: string) => void;
    onFilterChange: (name: string, value: string) => void;
    onClear: () => void;
  }>,
) {
  return (
    <FilterBar
      search={props.entityType}
      searchPlaceholder="Filtrar por tabla/entidad…"
      filters={[
        {
          name: "status",
          label: "Estado",
          value: props.status,
          options: ["open", "resolved", "ignored"].map((value) => ({
            value,
            label: value,
          })),
        },
        {
          name: "severity",
          label: "Severidad",
          value: props.severity,
          options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => ({
            value,
            label: value,
          })),
        },
      ]}
      onSearchChange={props.onEntityTypeChange}
      onFilterChange={props.onFilterChange}
      onClear={props.onClear}
    />
  );
}

function QualityError({
  error,
  onRetry,
}: Readonly<{ error: unknown; onRetry?: () => void }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error)
          ? error.message
          : "No se pudo completar la operación de calidad."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
      onRetry={onRetry}
    />
  );
}
