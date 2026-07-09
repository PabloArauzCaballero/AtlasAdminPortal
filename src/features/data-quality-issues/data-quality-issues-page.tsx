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
import type { ResolutionState } from "./types";

export function DataQualityIssuesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [entityType, setEntityType] = useState("");
  const [resolution, setResolution] = useState<ResolutionState>(null);
  const issues = useDataQualityIssues({
    page,
    limit: 20,
    status,
    severity,
    entityType,
  });
  const resolveMutation = useResolveDataQualityIssueMutation();
  const items = issues.data?.items ?? [];
  const columns = useMemo(() => buildIssueColumns(setResolution), []);

  function confirmResolution() {
    if (!resolution) return;
    resolveMutation.mutate(
      {
        issueId: resolution.issue.issueId,
        body: {
          resolution: resolution.resolution,
          reasonCode: resolution.reasonCode.trim() || "manual_review",
          notes: resolution.notes.trim() || "Revisión desde portal interno.",
        },
      },
      { onSuccess: () => setResolution(null) },
    );
  }

  return (
    <PermissionGate permissions={["dataQuality.issues.read"]}>
      <PageHeader
        eyebrow="Fase 5"
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
      {resolveMutation.error ? (
        <QualityError error={resolveMutation.error} />
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
      {resolution ? (
        <ResolutionDialog
          resolution={resolution}
          isLoading={resolveMutation.isPending}
          onCancel={() => setResolution(null)}
          onChange={setResolution}
          onConfirm={confirmResolution}
        />
      ) : null}
    </PermissionGate>
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
