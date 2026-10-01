"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDataEntities, useEndpoints } from "@/features/systems/hooks";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { serverPagedColumns } from "@/shared/components/data-table/server-columns";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { buildEndpointColumns, buildEntityColumns } from "./lineage-columns";
import { useModuleOptions } from "./module-options";
import { usePageSize } from "@/shared/lib/page-size";

const PAGE_SIZE = 20;

/**
 * Tablas y rutas del catálogo, paginadas en el servidor. Sustituye a las dos tablas del pie de la
 * antigua «Relaciones», que enseñaban las primeras 100 filas de cada listado como si fueran todas.
 */
export function LineageNodesTab() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [moduleFilter, setModule] = useState(searchParams.get("module") ?? "");
  const [tablesPage, setTablesPage] = useState(1);
  const [routesPage, setRoutesPage] = useState(1);
  const filters = { q, module: moduleFilter };
  const entities = useDataEntities({
    ...filters,
    page: tablesPage,
    limit: usePageSize(PAGE_SIZE),
  });
  const endpoints = useEndpoints({
    ...filters,
    page: routesPage,
    limit: usePageSize(PAGE_SIZE),
  });
  const modules = useModuleOptions();
  const entityColumns = useMemo(
    () => serverPagedColumns(buildEntityColumns()),
    [],
  );
  const endpointColumns = useMemo(
    () => serverPagedColumns(buildEndpointColumns()),
    [],
  );

  const resetPages = () => {
    setTablesPage(1);
    setRoutesPage(1);
  };

  return (
    <div className="space-y-6">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar tabla, esquema, entidad, módulo, responsable o ruta…"
        searchTooltip="Tablas: nombre, entidad, modelo, esquema, módulo y responsable. Rutas: código, ruta, nombre de ruta y propósito."
        filters={[
          {
            name: "module",
            label: "Módulo",
            value: moduleFilter,
            options: modules.options,
            tooltip: "Módulo exacto de la tabla o de la ruta.",
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          resetPages();
        }}
        onFilterChange={(_, value) => {
          setModule(value);
          resetPages();
        }}
        onClear={() => {
          setQ("");
          setModule("");
          resetPages();
        }}
      />
      <NodesCard
        title="Tablas"
        description="Abre «Ver impacto» para ver qué rutas tocan cada tabla."
        query={entities}
        columns={entityColumns}
        onPageChange={setTablesPage}
        emptyTitle="Ninguna tabla cumple el filtro."
        errorText="No se pudieron cargar las tablas."
      />
      <NodesCard
        title="Rutas"
        description="Rutas del catálogo con su módulo, riesgo y si exponen datos personales."
        query={endpoints}
        columns={endpointColumns}
        onPageChange={setRoutesPage}
        emptyTitle="Ninguna ruta cumple el filtro."
        errorText="No se pudieron cargar las rutas."
      />
    </div>
  );
}

type PagedQuery<T> = {
  data?: { items: T[]; meta: Parameters<typeof DataTable<T>>[0]["meta"] };
  isLoading: boolean;
  error: unknown;
  refetch: () => unknown;
};

function NodesCard<T>({
  title,
  description,
  query,
  columns,
  onPageChange,
  emptyTitle,
  errorText,
}: Readonly<{
  title: string;
  description: string;
  query: PagedQuery<T>;
  columns: Parameters<typeof DataTable<T>>[0]["columns"];
  onPageChange: (page: number) => void;
  emptyTitle: string;
  errorText: string;
}>) {
  const total = query.data?.meta?.total;
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title={
            total === undefined ? title : `${title} (${formatNumber(total)})`
          }
          description={description}
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        {query.isLoading ? <LoadingSkeleton rows={4} /> : null}
        {query.error ? (
          <ErrorState
            description={
              isAtlasApiError(query.error) ? query.error.message : errorText
            }
            requestId={
              isAtlasApiError(query.error) ? query.error.requestId : undefined
            }
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {query.data ? (
          <DataTable
            data={query.data.items}
            columns={columns}
            meta={query.data.meta}
            onPageChange={onPageChange}
            emptyTitle={emptyTitle}
            emptyDescription="Prueba a limpiar el buscador o el módulo."
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
