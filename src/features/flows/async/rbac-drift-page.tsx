"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useRbacDrift } from "./hooks";
import { DRIFT } from "./labels";
import type { RbacDriftItem, RbacDriftResponse } from "./types";
import { FlowCatalogNotLoaded } from "../flow-catalog-not-loaded";

const PAGE_SIZE = 20;

/**
 * Pantallas cuyo menú pide un permiso que la API no aplica, medido sobre las llamadas que DE VERDAD
 * salieron de cada pantalla. Sin uso real no hay nada que medir, y la vista lo dice en vez de
 * enseñar una lista vacía que se leería como «no hay deriva».
 */
export function RbacDriftPage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedRbacDriftPage />
    </PermissionGate>
  );
}

export function contarSinGuarda(data: RbacDriftResponse | undefined): number {
  if (data?.summary) return data.summary.bySeverity.SIN_GUARDA;
  return (data?.screens ?? []).reduce(
    (n, pantalla) =>
      n +
      pantalla.calls.filter((call) => call.severity === "SIN_GUARDA").length,
    0,
  );
}

const SEVERITY_OPTIONS = (Object.keys(DRIFT) as Array<keyof typeof DRIFT>).map(
  (value) => ({
    value,
    label: DRIFT[value].label,
    description: DRIFT[value].hint,
  }),
);

const COLUMNS: ColumnDef<RbacDriftItem>[] = [
  {
    header: "Pantalla",
    accessorKey: "route",
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-xs">{row.original.route}</p>
        <p className="text-xs text-atlas-muted">{row.original.clientCode}</p>
      </div>
    ),
  },
  {
    header: "El menú pide",
    id: "menu",
    cell: ({ row }) => (
      <span className="block max-w-xs text-xs text-atlas-muted">
        {[...row.original.navPermissions, ...row.original.navRoles].join(
          ", ",
        ) || "—"}
      </span>
    ),
  },
  {
    header: "Desenlace",
    accessorKey: "severity",
    cell: ({ row }) => (
      <span title={DRIFT[row.original.severity].hint}>
        <Badge tone={DRIFT[row.original.severity].tone} dot>
          {DRIFT[row.original.severity].label}
        </Badge>
      </span>
    ),
  },
  {
    header: "Llamada",
    id: "call",
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <MethodBadge method={row.original.method} />
        <span className="font-mono text-xs">{row.original.path}</span>
      </span>
    ),
  },
  {
    header: "Roles de la API",
    id: "roles",
    cell: ({ row }) => (
      <span className="text-xs text-atlas-muted">
        {row.original.roles.length ? row.original.roles.join(", ") : "—"}
      </span>
    ),
  },
];

/** Un Core anterior no manda `items`: se aplanan las pantallas y la tabla enseña todo, sin paginar. */
function rowsOf(data: RbacDriftResponse | undefined): RbacDriftItem[] {
  if (!data) return [];
  if (data.items) return data.items;
  return data.screens.flatMap((pantalla) =>
    pantalla.calls.map((call) => ({
      clientCode: pantalla.clientCode,
      route: pantalla.route,
      navPermissions: pantalla.navPermissions,
      navRoles: pantalla.navRoles,
      ...call,
    })),
  );
}

function AuthorizedRbacDriftPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("");
  const [clientCode, setClientCode] = useState("");
  const query = useRbacDrift({
    q: q.trim(),
    severity,
    clientCode,
    page,
    limit: PAGE_SIZE,
  });
  const data = query.data;
  const summary = data?.summary;
  const sinGuarda = contarSinGuarda(data);
  const columns = useMemo(() => withoutClientSorting(COLUMNS), []);
  const hayFiltro = Boolean(q.trim() || severity || clientCode);

  return (
    <>
      <PageHeader
        icon={ShieldAlert}
        eyebrow="Systems Ops · Mapa de rutas"
        title="Deriva de permisos"
        description="Pantallas cuyo menú exige un permiso que la API no aplica en las llamadas que se hicieron desde ellas. Sólo «Sin guarda» es una avería; «Sólo rol» y «Pública» son otra conversación."
      />
      <FlowCatalogNotLoaded />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Pantallas con llamadas observadas"
          value={data?.screensWithObservedEdges ?? "—"}
          icon={ShieldAlert}
          hint="Últimos 30 días, por la pantalla que declara cada llamada"
        />
        <MetricCard
          label="Pantallas con deriva"
          value={summary?.screensWithDrift ?? data?.screens.length ?? "—"}
        />
        <MetricCard
          label="Llamadas sin guarda"
          value={data ? sinGuarda : "—"}
          tone={sinGuarda ? "warning" : "success"}
        />
      </div>
      {data?.notMeasured?.length ? (
        <p className="mb-4 text-xs text-atlas-muted">
          No se mide aquí para {data.notMeasured.join(", ")}: sus pantallas
          llaman a otros bloques, y la deriva se calcula contra los endpoints de
          AtlasBackend. Que no aparezcan no significa que no tengan deriva.
        </p>
      ) : null}
      {data?.truncated ? (
        <p className="mb-4 text-xs text-amber-700">
          La consulta de llamadas vino cortada: esto opina sobre datos
          incompletos.
        </p>
      ) : null}
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por pantalla, ruta, método o flujo…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en el cliente, la ruta de la pantalla, el método, la ruta de la API llamada y el identificador del flujo."
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "severity") setSeverity(value);
          if (name === "clientCode") setClientCode(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setSeverity("");
          setClientCode("");
          setPage(1);
        }}
        filters={[
          {
            name: "severity",
            label: "Desenlace",
            value: severity,
            tooltip:
              "Separa las llamadas «Sin guarda» —la avería— de las «Sólo rol» y las «Públicas», que son otra puerta o una decisión declarada.",
            options: SEVERITY_OPTIONS,
          },
          {
            name: "clientCode",
            label: "Cliente",
            value: clientCode,
            tooltip:
              "Deja sólo las pantallas de un cliente. Las opciones son los clientes con deriva en todo el conjunto, no sólo los de esta página.",
            options: (summary?.clients ?? []).map((value) => ({
              value,
              label: value,
              description: `Pantallas del cliente ${value}.`,
            })),
          },
        ]}
      />
      {query.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo cargar la deriva de permisos."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {data ? (
        <DataTable
          data={rowsOf(data)}
          columns={columns}
          meta={data.meta}
          onPageChange={setPage}
          emptyTitle={
            hayFiltro
              ? "Ninguna llamada coincide con la búsqueda o los filtros."
              : data.screensWithObservedEdges === 0
                ? "Aún no hay llamadas atribuidas a pantallas"
                : "Sin deriva en lo observado"
          }
          emptyDescription={
            hayFiltro
              ? "Quita el texto o los filtros para volver a ver todas las llamadas."
              : data.screensWithObservedEdges === 0
                ? "La deriva se mide sobre lo que las pantallas llamaron de verdad. Sin uso real, una lista vacía no significa que no haya deriva."
                : "Todas las llamadas observadas desde pantallas con permiso de menú exigen ese permiso en la API."
          }
        />
      ) : null}
    </>
  );
}
