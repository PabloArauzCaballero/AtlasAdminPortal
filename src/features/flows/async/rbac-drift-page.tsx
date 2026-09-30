"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
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
import { driftAction, driftSentence } from "./rbac-drift-words";
import type { RbacDriftItem, RbacDriftResponse } from "./types";
import { FlowCatalogNotLoaded } from "../flow-catalog-not-loaded";
import { CLIENT_OPTIONS, labelFrom } from "../filter-options";

const PAGE_SIZE = 20;

/**
 * Lo que deja a alguien delante de «sin permiso» o abre una puerta que el menú promete cerrada: un
 * permiso que la base no tiene, un menú que pide un permiso distinto del de la operación, o una
 * operación sin protección. Cada fila lo dice en una frase y enlaza a la ficha de la operación.
 */
export function RbacDriftPage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedRbacDriftPage />
    </PermissionGate>
  );
}

export function contarSinGuarda(data: RbacDriftResponse | undefined): number {
  if (data?.summary) return data.summary.bySeverity.SIN_GUARDA ?? 0;
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
    header: "Qué pasa",
    id: "what",
    cell: ({ row }) => (
      <div className="max-w-md space-y-1">
        <Badge tone={DRIFT[row.original.severity].tone} dot>
          {DRIFT[row.original.severity].label}
        </Badge>
        <p className="text-sm text-atlas-text">{driftSentence(row.original)}</p>
      </div>
    ),
  },
  {
    header: "Pantalla",
    accessorKey: "route",
    cell: ({ row }) =>
      row.original.route ? (
        <div>
          <p className="font-mono text-xs">{row.original.route}</p>
          <p className="text-xs text-atlas-muted">
            {labelFrom(CLIENT_OPTIONS, row.original.clientCode)}
          </p>
        </div>
      ) : (
        <span className="text-xs text-atlas-muted">
          Ninguna pantalla la llamó todavía
        </span>
      ),
  },
  {
    header: "Operación",
    id: "call",
    cell: ({ row }) =>
      row.original.flowId ? (
        <div className="space-y-1">
          <span className="flex items-center gap-2">
            {row.original.method ? (
              <MethodBadge method={row.original.method} />
            ) : null}
            <span className="font-mono text-xs">{row.original.path}</span>
          </span>
          <Link
            className="text-xs text-atlas-accent underline"
            href={`/internal/flows?flow=${encodeURIComponent(row.original.flowId)}`}
          >
            Ver la ficha de la operación
          </Link>
        </div>
      ) : (
        <span className="text-xs text-atlas-muted">Es el menú</span>
      ),
  },
  {
    header: "Qué hacer",
    id: "action",
    cell: ({ row }) => (
      <span className="block max-w-xs text-xs text-atlas-muted">
        {driftAction(row.original)}
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
  const porClase = summary?.bySeverity ?? {};
  const sinGuarda = contarSinGuarda(data);
  const averias =
    summary?.breaking ??
    (porClase.PERMISO_FUERA_DEL_CATALOGO ?? 0) +
      (porClase.MENU_PERMISO_DISTINTO ?? 0) +
      sinGuarda;
  const columns = useMemo(() => withoutClientSorting(COLUMNS), []);
  const hayFiltro = Boolean(q.trim() || severity || clientCode);

  return (
    <>
      <PageHeader
        icon={ShieldAlert}
        eyebrow="Sistemas · Mapa de rutas"
        title="Deriva de permisos"
        description="Dónde el menú y la operación no piden lo mismo, y qué permisos se exigen sin existir. Lo primero de la lista deja a alguien delante de «sin permiso» o abre una puerta que el menú promete cerrada."
      />
      <FlowCatalogNotLoaded />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Averías que dejan fuera a alguien"
          value={data ? averias : "—"}
          icon={ShieldAlert}
          tone={averias ? "critical" : "success"}
          hint="Permisos que no existen, menús que piden otro permiso y operaciones sin protección"
        />
        <MetricCard
          label="Permisos que la base no tiene"
          value={summary?.permissionsOutsideCatalog?.length ?? "—"}
          tone={
            summary?.permissionsOutsideCatalog?.length ? "critical" : "default"
          }
          hint={summary?.permissionsOutsideCatalog?.join(", ") || undefined}
        />
        <MetricCard
          label="Menús que piden otro permiso"
          value={data ? (porClase.MENU_PERMISO_DISTINTO ?? 0) : "—"}
          tone={porClase.MENU_PERMISO_DISTINTO ? "warning" : "default"}
        />
        <MetricCard
          label="Llamadas sin guarda"
          value={data ? sinGuarda : "—"}
          tone={sinGuarda ? "warning" : "success"}
          hint={`Sobre ${data?.screensWithObservedEdges ?? "—"} pantallas usadas en los últimos 30 días`}
        />
      </div>
      {data?.catalogMeasured === false ? (
        <p className="mb-4 text-xs text-amber-700">
          En este entorno la base no tiene cargado el catálogo de permisos: no
          se puede comprobar si falta alguno.
        </p>
      ) : null}
      {data?.notMeasured?.length ? (
        <p className="mb-4 text-xs text-atlas-muted">
          No se mide aquí para{" "}
          {data.notMeasured
            .map((code) => labelFrom(CLIENT_OPTIONS, code))
            .join(", ")}
          : sus pantallas llaman a otros sistemas. Que no aparezcan no significa
          que no tengan deriva.
        </p>
      ) : null}
      {data?.truncated ? (
        <p className="mb-4 text-xs text-amber-700">
          La consulta vino cortada: esto opina sobre datos incompletos.
        </p>
      ) : null}
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por pantalla, operación o permiso…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en la pantalla, la operación, su ruta y los permisos que piden el menú y la operación."
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
            label: "Qué pasa",
            value: severity,
            tooltip:
              "Las tres primeras dejan a alguien fuera o abren una puerta; «Pública» y «Decide por rol» son informativas.",
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
              label: labelFrom(CLIENT_OPTIONS, value),
              description: `Pantallas de ${labelFrom(CLIENT_OPTIONS, value)}.`,
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
              ? "Nada coincide con la búsqueda o los filtros."
              : data.screensWithObservedEdges === 0
                ? "Aún no hay llamadas atribuidas a pantallas"
                : "Sin deriva en lo observado"
          }
          emptyDescription={
            hayFiltro
              ? "Quita el texto o los filtros para volver a verlo todo."
              : data.screensWithObservedEdges === 0
                ? "El desajuste entre menú y operación se mide sobre lo que las pantallas llamaron de verdad. Sin uso real, una lista vacía no significa que no lo haya."
                : "Cada pantalla usada pide en el menú lo mismo que exigen sus operaciones, y todos los permisos existen."
          }
        />
      ) : null}
    </>
  );
}
