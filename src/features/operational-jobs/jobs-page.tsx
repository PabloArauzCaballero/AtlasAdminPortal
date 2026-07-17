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
import { buildJobRunColumns } from "./job-columns";
import { useJobRuns } from "./hooks";

export function JobsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["internal.jobs.read"]}>
      <AuthorizedJobsPage />
    </PermissionGate>
  );
}

function AuthorizedJobsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [queue, setQueue] = useState("");
  const jobs = useJobRuns({ page, limit: 20, q, status, queue });
  const items = useMemo(() => jobs.data?.items ?? [], [jobs.data]);
  const columns = useMemo(() => buildJobRunColumns(), []);
  const statusOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.status)),
    [items],
  );
  const queueOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.queue)),
    [items],
  );

  return (
    <>
      <PageHeader
        eyebrow="Jobs operativos"
        title="Jobs internos"
        description="Seguimiento operativo de procesos asíncronos, colas, reintentos y ejecuciones pesadas del sistema."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar job, cola o estado…"
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
          },
          { name: "queue", label: "Cola", value: queue, options: queueOptions },
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
              : "No se pudieron cargar jobs internos."
          }
          requestId={
            isAtlasApiError(jobs.error) ? jobs.error.requestId : undefined
          }
          onRetry={() => void jobs.refetch()}
        />
      ) : null}
      {jobs.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Jobs"
              value={formatNumber(jobs.data.meta.total)}
            />
            <MetricCard label="Visibles" value={formatNumber(items.length)} />
            <MetricCard
              label="En ejecución"
              value={formatNumber(
                items.filter((item) => item.status?.toUpperCase() === "RUNNING")
                  .length,
              )}
            />
            <MetricCard
              label="Fallidos"
              value={formatNumber(
                items.filter((item) => item.status?.toUpperCase() === "FAILED")
                  .length,
              )}
            />
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={jobs.data.meta}
            onPageChange={setPage}
            emptyTitle="No hay jobs para los filtros actuales."
          />
        </div>
      ) : null}
    </>
  );
}
