"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { uniqueTextOptions } from "@/shared/lib/options";
import { buildDataExportColumns } from "./export-columns";
import { useDataExports } from "./hooks";

export function ExportsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [resourceType, setResourceType] = useState("");
  const exportsQuery = useDataExports({
    page,
    limit: 20,
    q,
    status,
    resourceType,
  });
  const items = useMemo(
    () => exportsQuery.data?.items ?? [],
    [exportsQuery.data],
  );
  const columns = useMemo(() => buildDataExportColumns(), []);
  const statusOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.status)),
    [items],
  );
  const resourceOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.resourceType)),
    [items],
  );

  return (
    <PermissionGate permissions={["internal.exports.read"]}>
      <PageHeader
        eyebrow="Fase 9"
        title="Exportaciones"
        description="Solicitudes de exportación controladas por políticas, auditoría y vencimiento de acceso."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar exportación, recurso o solicitante…"
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
          },
          {
            name: "resourceType",
            label: "Recurso",
            value: resourceType,
            options: resourceOptions,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "resourceType") setResourceType(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("");
          setResourceType("");
          setPage(1);
        }}
      />
      {exportsQuery.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {exportsQuery.error ? (
        <ErrorState
          description={
            isAtlasApiError(exportsQuery.error)
              ? exportsQuery.error.message
              : "No se pudieron cargar exportaciones."
          }
          requestId={
            isAtlasApiError(exportsQuery.error)
              ? exportsQuery.error.requestId
              : undefined
          }
          onRetry={() => void exportsQuery.refetch()}
        />
      ) : null}
      {exportsQuery.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Exportaciones"
              value={formatNumber(exportsQuery.data.meta.total)}
            />
            <MetricCard label="Visibles" value={formatNumber(items.length)} />
            <MetricCard
              label="Disponibles"
              value={formatNumber(
                items.filter((item) => Boolean(item.downloadUrl)).length,
              )}
            />
            <MetricCard
              label="Fallidas"
              value={formatNumber(
                items.filter((item) => item.status?.toUpperCase() === "FAILED")
                  .length,
              )}
            />
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={exportsQuery.data.meta}
            onPageChange={setPage}
            emptyTitle="No hay exportaciones para los filtros actuales."
          />
        </div>
      ) : null}
    </PermissionGate>
  );
}
