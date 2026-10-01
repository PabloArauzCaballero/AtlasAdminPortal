"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBusinessTermFacets, useBusinessTerms } from "./hooks";
import { buildBusinessTermColumns } from "./term-columns";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { serverPagedColumns } from "@/shared/components/data-table/server-columns";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import type { Option } from "@/shared/lib/options";
import { usePageSize } from "@/shared/lib/page-size";

export const TERM_TYPE_OPTIONS: Option[] = [
  {
    value: "table",
    label: "Tabla",
    description: "Una tabla del catálogo de datos.",
  },
  {
    value: "field",
    label: "Campo",
    description: "Una columna de una tabla.",
  },
  {
    value: "domain",
    label: "Dominio",
    description: "Un dominio de negocio (también en la pestaña «Dominios»).",
  },
];

/**
 * El glosario, paginado y filtrado en el servidor sobre el catálogo entero. Antes el servidor leía
 * 80 dominios, 120 tablas y 240 campos y paginaba en memoria; el filtro «Dominio» no llegaba al
 * servidor y sus opciones salían de la página cargada.
 */
export function GlossaryTermsTab() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [domain, setDomain] = useState(searchParams.get("domain") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const terms = useBusinessTerms({
    page,
    limit: usePageSize(20),
    q,
    domain,
    type,
  });
  const facets = useBusinessTermFacets();
  const columns = useMemo(
    () => serverPagedColumns(buildBusinessTermColumns()),
    [],
  );
  const domainOptions = useMemo<Option[]>(
    () =>
      (facets.data?.domains ?? []).map((item) => ({
        value: item.value,
        label: `${item.value} (${formatNumber(item.total)})`,
      })),
    [facets.data],
  );
  const countOf = (kind: string) =>
    facets.data?.types.find((item) => item.value === kind)?.total;

  return (
    <div className="space-y-4">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar término, clave, definición, dominio o dueño…"
        searchTooltip="Busca en el servidor, sobre el glosario entero, en el nombre, la clave, la definición, el dominio y el dueño."
        filters={[
          {
            name: "type",
            label: "Tipo",
            value: type,
            options: TERM_TYPE_OPTIONS,
            tooltip: "Tablas, campos o dominios.",
          },
          {
            name: "domain",
            label: "Dominio",
            value: domain,
            options: domainOptions,
            tooltip:
              "Dominio del término; si la tabla no declara dominio, su módulo. Las opciones y cifras cuentan el glosario entero.",
          },
        ]}
        onSearchChange={(value) => {
          setPage(1);
          setQ(value);
        }}
        onFilterChange={(name, value) => {
          setPage(1);
          if (name === "type") setType(value);
          if (name === "domain") setDomain(value);
        }}
        onClear={() => {
          setPage(1);
          setQ("");
          setDomain("");
          setType("");
        }}
      />
      {terms.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {terms.error ? (
        <ErrorState
          description={
            isAtlasApiError(terms.error)
              ? terms.error.message
              : "No se pudo cargar el glosario."
          }
          requestId={
            isAtlasApiError(terms.error) ? terms.error.requestId : undefined
          }
          onRetry={() => void terms.refetch()}
        />
      ) : null}
      {terms.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Términos que cumplen el filtro"
              value={formatNumber(terms.data.meta.total)}
            />
            <MetricCard
              label="Tablas en el glosario"
              value={
                countOf("table") === undefined
                  ? "—"
                  : formatNumber(countOf("table") ?? 0)
              }
            />
            <MetricCard
              label="Campos en el glosario"
              value={
                countOf("field") === undefined
                  ? "—"
                  : formatNumber(countOf("field") ?? 0)
              }
            />
            <MetricCard
              label="Dominios con términos"
              value={
                facets.data ? formatNumber(facets.data.domains.length) : "—"
              }
            />
          </section>
          <Card>
            <CardContent>
              <DataTable
                data={terms.data.items}
                columns={columns}
                meta={terms.data.meta}
                onPageChange={setPage}
                emptyTitle="Ningún término cumple el filtro."
                emptyDescription="Prueba a limpiar la búsqueda, el tipo o el dominio."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
