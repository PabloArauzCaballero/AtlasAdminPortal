"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { serverPagedColumns } from "@/shared/components/data-table/server-columns";
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
import { ChartColumn } from "lucide-react";

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
  const columns = useMemo(() => serverPagedColumns(buildReportColumns()), []);
  // Las opciones salen del catálogo entero que publica el servidor, no de la página cargada.
  const domainOptions = useMemo(
    () => uniqueTextOptions(reports.data?.facets?.domains ?? []),
    [reports.data?.facets],
  );
  const statusOptions = useMemo(
    () => uniqueTextOptions(reports.data?.facets?.statuses ?? []),
    [reports.data?.facets],
  );
  const summary = reports.data?.summary;

  return (
    <>
      <PageHeader
        icon={ChartColumn}
        eyebrow="Reportería"
        title="Reportería dinámica"
        description="Los informes que Atlas sabe calcular. Están definidos en el código del servidor (no hay tabla de informes) y cada uno se calcula en vivo al ejecutarlo; no se guarda un historial."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar informe, clave, descripción, dominio, dueño o fuente…"
        searchTooltip="Busca en el servidor en el nombre, la clave, la descripción, el dominio, el dueño y la fuente del informe."
        filters={[
          {
            name: "domain",
            label: "Dominio",
            value: domain,
            options: domainOptions,
            tooltip: "Área de negocio del informe.",
          },
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
            tooltip: "Si el informe está disponible para ejecutarse.",
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
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {/* Cifras de TODO lo filtrado (`summary` del servidor), no de la página. «Activos»
                comparaba con `active` en minúscula y el catálogo dice ACTIVE: salía siempre 0. */}
            <MetricCard
              label="Informes"
              value={formatNumber(reports.data.meta.total)}
            />
            <MetricCard
              label="Activos"
              value={summary ? formatNumber(summary.active) : "—"}
            />
            <MetricCard
              label="Críticos o altos"
              value={summary ? formatNumber(summary.critical) : "—"}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Definiciones disponibles"
                description="Cada informe se abre con sus bloques y sus filtros, y se calcula en vivo al ejecutarlo."
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
