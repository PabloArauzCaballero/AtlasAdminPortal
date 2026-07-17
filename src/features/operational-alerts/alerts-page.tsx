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
import { buildAlertColumns } from "./alert-columns";
import { useAlerts } from "./hooks";

export function AlertsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["internal.alerts.read"]}>
      <AuthorizedAlertsPage />
    </PermissionGate>
  );
}

function AuthorizedAlertsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const alerts = useAlerts({ page, limit: 20, q, severity, status });
  const items = useMemo(() => alerts.data?.items ?? [], [alerts.data]);
  const columns = useMemo(() => buildAlertColumns(), []);
  const severityOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.severity)),
    [items],
  );
  const statusOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.status)),
    [items],
  );

  return (
    <>
      <PageHeader
        eyebrow="Alertas operativas"
        title="Alertas operativas"
        description="Seguimiento de alertas del sistema interno, severidad, fuente y reconocimiento auditable."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar alerta, fuente o recurso…"
        filters={[
          {
            name: "severity",
            label: "Severidad",
            value: severity,
            options: severityOptions,
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
          if (name === "severity") setSeverity(value);
          if (name === "status") setStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setSeverity("");
          setStatus("");
          setPage(1);
        }}
      />
      {alerts.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {alerts.error ? (
        <ErrorState
          description={
            isAtlasApiError(alerts.error)
              ? alerts.error.message
              : "No se pudieron cargar alertas operativas."
          }
          requestId={
            isAtlasApiError(alerts.error) ? alerts.error.requestId : undefined
          }
          onRetry={() => void alerts.refetch()}
        />
      ) : null}
      {alerts.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Alertas"
              value={formatNumber(alerts.data.meta.total)}
            />
            <MetricCard label="Visibles" value={formatNumber(items.length)} />
            <MetricCard
              label="Críticas"
              value={formatNumber(
                items.filter(
                  (item) => item.severity?.toUpperCase() === "CRITICAL",
                ).length,
              )}
            />
            <MetricCard
              label="Sin reconocer"
              value={formatNumber(
                items.filter((item) => !item.acknowledgedAt).length,
              )}
            />
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={alerts.data.meta}
            onPageChange={setPage}
            emptyTitle="No hay alertas para los filtros actuales."
          />
        </div>
      ) : null}
    </>
  );
}
