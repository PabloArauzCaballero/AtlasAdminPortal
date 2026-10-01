"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { buildJobRunColumns } from "./job-columns";
import { useJobRuns } from "./hooks";
import { JOB_QUEUE_OPTIONS, JOB_STATUS_OPTIONS } from "./labels";
import { usePageSize } from "@/shared/lib/page-size";

/** Pestaña «Historial» de Jobs: cada corrida registrada en `system_job_runs`. */
export function JobHistoryTab() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [queue, setQueue] = useState("");
  const jobs = useJobRuns({ page, limit: usePageSize(20), q, status, queue });
  const items = useMemo(() => jobs.data?.items ?? [], [jobs.data]);
  const columns = useMemo(() => buildJobRunColumns(), []);
  const byStatus = jobs.data?.summary?.byStatus;
  /*
   * Con el resumen del backend las tarjetas cuentan TODO el filtro. Sin él (un backend anterior)
   * sólo se puede contar la página, y la tarjeta lo dice en vez de presentarlo como el total.
   */
  const countStatus = (value: string) =>
    byStatus
      ? (byStatus[value] ?? 0)
      : items.filter((item) => item.status?.toUpperCase() === value).length;
  const scopeHint = byStatus ? undefined : "En esta página";

  return (
    <>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código del proceso…"
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: JOB_STATUS_OPTIONS,
          },
          {
            name: "queue",
            label: "Origen",
            value: queue,
            options: JOB_QUEUE_OPTIONS,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "queue") setQueue(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("");
          setQueue("");
          setPage(1);
        }}
      />
      {jobs.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {jobs.error ? (
        <ErrorState
          description={
            isAtlasApiError(jobs.error)
              ? jobs.error.message
              : "No se pudieron cargar las corridas."
          }
          requestId={
            isAtlasApiError(jobs.error) ? jobs.error.requestId : undefined
          }
          onRetry={() => void jobs.refetch()}
        />
      ) : null}
      {jobs.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Corridas"
              value={formatNumber(jobs.data.meta.total)}
            />
            <MetricCard
              label="Completadas"
              value={formatNumber(countStatus("COMPLETED"))}
              hint={scopeHint}
            />
            <MetricCard
              label="En ejecución"
              value={formatNumber(countStatus("RUNNING"))}
              hint={scopeHint}
            />
            <MetricCard
              label="Fallidas"
              value={formatNumber(countStatus("FAILED"))}
              hint={scopeHint}
              tone={countStatus("FAILED") > 0 ? "critical" : "default"}
            />
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={jobs.data.meta}
            onPageChange={setPage}
            emptyTitle="No hay corridas para los filtros actuales."
            emptyDescription="Prueba a quitar algún filtro."
          />
        </div>
      ) : null}
    </>
  );
}
