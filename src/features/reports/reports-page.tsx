"use client";

import { useMemo, useState } from "react";
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
import { uniqueTextOptions } from "@/shared/lib/options";
import { buildReportColumns } from "./report-columns";
import { useReports } from "./hooks";

export function ReportsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["reporting.read"]}>
      <AuthorizedReportsPage />
    </PermissionGate>
  );
}

function AuthorizedReportsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const reports = useReports({ page, limit: 20, q, domain, status });
  const items = useMemo(() => reports.data?.items ?? [], [reports.data]);
  const columns = useMemo(() => buildReportColumns(), []);
  const domainOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.domain)),
    [items],
  );
  const statusOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.status)),
    [items],
  );

  return (
    <>
      <PageHeader
        eyebrow="Reportería"
        title="Reportería dinámica"
        description="Inventario real de `report_definitions`, widgets y fuentes autorizadas del servicio interno."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar reporte, dominio, dueño o fuente…"
        filters={[
          {
            name: "domain",
            label: "Dominio",
            value: domain,
            options: domainOptions,
          },
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "domain") setDomain(value);
          if (name === "status") setStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setDomain("");
          setStatus("");
          setPage(1);
        }}
      />
      {reports.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {reports.error ? (
        <ErrorState
          description={
            isAtlasApiError(reports.error)
              ? reports.error.message
              : "No se pudieron cargar reportes."
          }
          requestId={
            isAtlasApiError(reports.error) ? reports.error.requestId : undefined
          }
          onRetry={() => void reports.refetch()}
        />
      ) : null}
      {reports.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Reportes"
              value={formatNumber(reports.data.meta.total)}
            />
            <MetricCard label="Visibles" value={formatNumber(items.length)} />
            <MetricCard
              label="Activos"
              value={formatNumber(
                items.filter((item) => item.status === "active").length,
              )}
            />
            <MetricCard
              label="Críticos"
              value={formatNumber(
                items.filter(
                  (item) =>
                    item.criticality === "HIGH" ||
                    item.criticality === "CRITICAL",
                ).length,
              )}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Definiciones disponibles"
                description="Cada reporte se abre con contratos, widgets, snapshots y ejecución controlada por permisos."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={items}
                columns={columns}
                meta={reports.data.meta}
                onPageChange={setPage}
                emptyTitle="No hay reportes para los filtros actuales."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
