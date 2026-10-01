"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTrafficRoutesPage } from "@/features/systems/traffic-hooks";
import type { TrafficLatencyRoute } from "@/features/systems/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/format";

const PAGE_SIZE = 20;

const METHOD_OPTIONS = ["GET", "POST", "PUT", "PATCH", "DELETE"].map(
  (value) => ({
    value,
    label: value,
    description: `Sólo las rutas que se llamaron con ${value}.`,
  }),
);

const COLUMNS: ColumnDef<TrafficLatencyRoute>[] = [
  {
    header: "Método",
    accessorKey: "method",
    cell: ({ row }) => <MethodBadge method={row.original.method} />,
  },
  {
    header: "Ruta",
    accessorKey: "routeTemplate",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.routeTemplate ?? "—"}
      </span>
    ),
  },
  {
    header: "Peticiones",
    accessorKey: "totalRequests",
    cell: ({ row }) => formatNumber(row.original.totalRequests),
  },
  {
    header: "Latencia prom.",
    accessorKey: "avgLatencyMs",
    cell: ({ row }) => `${formatNumber(row.original.avgLatencyMs)} ms`,
  },
  {
    header: "p95",
    accessorKey: "p95LatencyMs",
    cell: ({ row }) => `${formatNumber(row.original.p95LatencyMs)} ms`,
  },
  {
    header: "Tasa de error",
    accessorKey: "errorRate",
    cell: ({ row }) => (
      <Badge tone={row.original.errorRate > 0.02 ? "critical" : "success"}>
        {(row.original.errorRate * 100).toFixed(1)}%
      </Badge>
    ),
  },
  {
    header: "Última vez",
    accessorKey: "lastSeenAt",
    cell: ({ row }) => formatDateTime(row.original.lastSeenAt),
  },
];

/**
 * Las rutas con tráfico de la ventana: una fila por ruta, paginada y filtrada en el servidor. Los
 * gráficos de arriba usan su propia consulta (las de más tráfico); esta pide sólo la página que se ve.
 */
export function TrafficRoutesTable({
  windowHours,
  live,
}: Readonly<{ windowHours: number; live: boolean }>) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("");
  const routes = useTrafficRoutesPage(
    windowHours,
    { q: q.trim(), method, page, limit: PAGE_SIZE },
    { live },
  );
  const columns = useMemo(() => withoutClientSorting(COLUMNS), []);
  const hayFiltro = Boolean(q.trim() || method);

  return (
    <>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por ruta o método…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en la ruta y en el método de todas las rutas con tráfico en la ventana."
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(_name, value) => {
          setMethod(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setMethod("");
          setPage(1);
        }}
        filters={[
          {
            name: "method",
            label: "Método",
            value: method,
            tooltip:
              "Deja sólo las rutas llamadas con ese método HTTP: lecturas (GET) o escrituras (POST, PUT, PATCH, DELETE).",
            options: METHOD_OPTIONS,
          },
        ]}
      />
      {routes.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {routes.error ? (
        <ErrorState
          description={
            isAtlasApiError(routes.error)
              ? routes.error.message
              : "No se pudieron cargar las rutas con tráfico."
          }
          requestId={
            isAtlasApiError(routes.error) ? routes.error.requestId : undefined
          }
          onRetry={() => void routes.refetch()}
        />
      ) : null}
      {routes.data ? (
        <DataTable
          data={routes.data.routes}
          columns={columns}
          meta={routes.data.meta}
          onPageChange={setPage}
          emptyTitle={
            hayFiltro
              ? "Ninguna ruta coincide con la búsqueda o el filtro."
              : "Sin tráfico registrado en esta ventana."
          }
          emptyDescription={
            hayFiltro
              ? "Quita el texto o el filtro para volver a ver todas las rutas."
              : "Prueba con una ventana más amplia. Si sigue vacío, puede que no se estén registrando las peticiones: avisa al equipo técnico."
          }
        />
      ) : null}
    </>
  );
}
