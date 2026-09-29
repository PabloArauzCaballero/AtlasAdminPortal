"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLineageImpact } from "./hooks";
import { buildImpactColumns } from "./lineage-columns";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { serverPagedColumns } from "@/shared/components/data-table/server-columns";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import {
  FAMILY_OPTIONS,
  SEVERITY_OPTIONS,
  useModuleOptions,
} from "@/features/lineage/module-options";

/**
 * Las aristas del linaje paginadas en el servidor: qué ruta toca qué tabla (con severidad) y qué
 * tabla referencia a otra (sin ella). Las tarjetas salen del `summary` del servidor, que cuenta todo
 * lo filtrado; antes «Severidades visibles» contaba las de la página.
 */
export function LineageImpactTab() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [severity, setSeverity] = useState(searchParams.get("severity") ?? "");
  const [family, setFamily] = useState(searchParams.get("family") ?? "");
  const [domain, setDomain] = useState(searchParams.get("domain") ?? "");
  const impact = useLineageImpact({
    page,
    limit: 20,
    q,
    severity,
    family,
    domain,
  });
  const modules = useModuleOptions();
  const columns = useMemo(() => serverPagedColumns(buildImpactColumns()), []);
  const summary = impact.data?.summary;
  const bySeverity = summary?.bySeverity ?? {};

  const setFilter = (name: string, value: string) => {
    setPage(1);
    if (name === "severity") setSeverity(value);
    if (name === "family") setFamily(value);
    if (name === "domain") setDomain(value);
  };

  return (
    <div className="space-y-4">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar origen, destino, operación, tabla o descripción…"
        searchTooltip="Busca en el servidor en la ruta o tabla de origen, la tabla de destino, el tipo de operación y la descripción."
        filters={[
          {
            name: "family",
            label: "Relación",
            value: family,
            options: FAMILY_OPTIONS,
            tooltip:
              "Operación → tabla: quién toca el dato. Tabla → tabla: cómo se relacionan.",
          },
          {
            name: "severity",
            label: "Severidad",
            value: severity,
            options: SEVERITY_OPTIONS,
            tooltip:
              "Sólo aplica a operación → tabla; al elegirla, las relaciones entre tablas quedan fuera.",
          },
          {
            name: "domain",
            label: "Módulo",
            value: domain,
            options: modules.options,
            tooltip: "Aristas con alguno de sus dos extremos en este módulo.",
          },
        ]}
        onSearchChange={(value) => {
          setPage(1);
          setQ(value);
        }}
        onFilterChange={setFilter}
        onClear={() => {
          setPage(1);
          setQ("");
          setSeverity("");
          setFamily("");
          setDomain("");
        }}
      />
      {impact.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {impact.error ? (
        <ErrorState
          description={
            isAtlasApiError(impact.error)
              ? impact.error.message
              : "No se pudo cargar el impacto del linaje."
          }
          requestId={
            isAtlasApiError(impact.error) ? impact.error.requestId : undefined
          }
          onRetry={() => void impact.refetch()}
        />
      ) : null}
      {impact.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Aristas"
              value={formatNumber(impact.data.meta.total)}
            />
            <MetricCard
              label="Operación → tabla"
              value={formatNumber(summary?.byFamily.impact ?? 0)}
            />
            <MetricCard
              label="Tabla → tabla"
              value={formatNumber(summary?.byFamily.relationship ?? 0)}
            />
            <MetricCard
              label="Críticas o altas"
              value={formatNumber(
                (bySeverity.CRITICAL ?? 0) + (bySeverity.HIGH ?? 0),
              )}
              hint="Operación → tabla con severidad alta o crítica en lo filtrado."
            />
          </section>
          <Card>
            <CardContent>
              <DataTable
                data={impact.data.items}
                columns={columns}
                meta={impact.data.meta}
                onPageChange={setPage}
                emptyTitle="Ninguna arista cumple el filtro."
                emptyDescription="Prueba a limpiar la búsqueda o los filtros."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
