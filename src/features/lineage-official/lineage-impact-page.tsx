"use client";

import { useMemo, useState } from "react";
import { useLineageImpact } from "./hooks";
import { buildImpactColumns } from "./lineage-columns";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { uniqueTextOptions } from "@/shared/lib/options";
import { formatNumber } from "@/shared/lib/format";

export function LineageImpactPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["lineage.read"]}>
      <AuthorizedLineageImpactPage />
    </PermissionGate>
  );
}

function AuthorizedLineageImpactPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("");
  const impact = useLineageImpact({ page, limit: 20, q, severity });
  const items = useMemo(() => impact.data?.items ?? [], [impact.data?.items]);
  const columns = useMemo(() => buildImpactColumns(), []);
  const severityOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.severity)),
    [items],
  );

  return (
    <>
      <PageHeader
        eyebrow="Lineage"
        title="Impacto entre activos"
        description="Consulta server-side del impacto entre tablas, endpoints, reportes, reglas, políticas y jobs."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar nodo, impacto o descripción…"
        filters={[
          {
            name: "severity",
            label: "Severidad",
            value: severity,
            options: severityOptions,
          },
        ]}
        onSearchChange={(value) => {
          setPage(1);
          setQ(value);
        }}
        onFilterChange={(_, value) => {
          setPage(1);
          setSeverity(value);
        }}
        onClear={() => {
          setPage(1);
          setQ("");
          setSeverity("");
        }}
      />
      {impact.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {impact.error ? (
        <ErrorState
          description={
            isAtlasApiError(impact.error)
              ? impact.error.message
              : "No se pudo cargar impacto de lineage."
          }
          requestId={
            isAtlasApiError(impact.error) ? impact.error.requestId : undefined
          }
          onRetry={() => void impact.refetch()}
        />
      ) : null}
      {impact.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Impactos"
              value={formatNumber(impact.data.meta.total)}
            />
            <MetricCard label="Mostrados" value={formatNumber(items.length)} />
            <MetricCard
              label="Severidades visibles"
              value={formatNumber(severityOptions.length)}
            />
            <MetricCard
              label="Con ruta"
              value={formatNumber(
                items.filter((item) => item.path?.length).length,
              )}
            />
          </section>
          <Card>
            <CardContent>
              <DataTable
                data={items}
                columns={columns}
                meta={impact.data.meta}
                onPageChange={setPage}
                emptyTitle="No hay impactos para el filtro aplicado."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
