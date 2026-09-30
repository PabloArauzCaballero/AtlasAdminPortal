"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Hourglass } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { MetricCard } from "@/shared/components/layout/metric-card";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { DomainEventsTable } from "./domain-events-table";
import { usePendingWork } from "./hooks";
import { DIAGNOSIS, fecha } from "./labels";
import type { PendingWorkFlow } from "./types";
import { FlowCatalogNotLoaded } from "../flow-catalog-not-loaded";

const VENTANAS = [7, 30, 90];
const PAGE_SIZE = 20;

const STATE_OPTIONS = [
  {
    value: "pending",
    label: "Con pendientes",
    description: "Tienen eventos encolados que nadie ha recogido todavía.",
  },
  {
    value: "failed",
    label: "Con fallidos",
    description: "Tienen eventos que el consumidor intentó y no pudo procesar.",
  },
  {
    value: "skipped",
    label: "Saltados por el consumidor",
    description:
      "El consumidor corre y los pendientes son más viejos que su última pasada: la avería más engañosa.",
  },
];

/**
 * El mapa de Flujos acababa en el endpoint. Esta vista enseña lo que un flujo deja encargado al
 * responder y si alguien lo recoge, separando el entorno de la avería: un pendiente sólo es avería
 * cuando el consumidor corre y lo ha dejado atrás.
 */
export function PendingWorkPage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedPendingWorkPage />
    </PermissionGate>
  );
}

function AuthorizedPendingWorkPage() {
  const [ventana, setVentana] = useState(30);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const query = usePendingWork({
    windowDays: ventana,
    q: q.trim(),
    state,
    page,
    limit: PAGE_SIZE,
  });
  const data = query.data;
  const diagnostico = data ? DIAGNOSIS[data.diagnosis] : null;
  const columns = useMemo<ColumnDef<PendingWorkFlow>[]>(
    () => [
      {
        header: "Flujo",
        accessorKey: "path",
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <MethodBadge method={row.original.method} />
            <span className="font-mono text-xs">{row.original.path}</span>
          </span>
        ),
      },
      { header: "Eventos", accessorKey: "events" },
      { header: "Pendientes", accessorKey: "pending" },
      { header: "Fallidos", accessorKey: "failed" },
      {
        header: "Pendiente desde",
        accessorKey: "pendingSince",
        cell: ({ row }) => (
          <span className="text-xs">{fecha(row.original.pendingSince)}</span>
        ),
      },
      {
        header: "Último procesado",
        accessorKey: "lastProcessedAt",
        cell: ({ row }) => (
          <span className="text-xs">
            {fecha(row.original.lastProcessedAt, "Nunca en la ventana")}
          </span>
        ),
      },
      {
        header: "Consumidor",
        accessorKey: "skippedByConsumer",
        cell: ({ row }) =>
          row.original.skippedByConsumer ? (
            <Badge tone="critical" dot>
              Lo saltó
            </Badge>
          ) : null,
      },
    ],
    [],
  );
  const serverColumns = useMemo(() => withoutClientSorting(columns), [columns]);
  const hayFiltro = Boolean(q.trim() || state);

  return (
    <>
      <PageHeader
        icon={Hourglass}
        eyebrow="Sistemas · Mapa de rutas"
        title="Trabajo pendiente"
        description="Lo que cada flujo deja encargado al responder (la cola de eventos), si alguien lo recoge y qué eventos de dominio terminan de verdad en un aviso."
        actions={
          <Select
            name="ventana"
            ariaLabel="Ventana"
            value={String(ventana)}
            onChange={(valor) => {
              setVentana(Number(valor));
              setPage(1);
            }}
            options={VENTANAS.map((dias) => ({
              value: String(dias),
              label: `Últimos ${dias} días`,
              description: `Cuenta el trabajo encargado en los últimos ${dias} días.`,
            }))}
          />
        }
      />
      <FlowCatalogNotLoaded />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Diagnóstico"
          value={diagnostico?.label ?? "—"}
          icon={Hourglass}
          tone={diagnostico?.tone === "success" ? "success" : "warning"}
          hint={diagnostico?.hint}
        />
        <MetricCard
          label="Pendientes"
          value={data?.pending ?? "—"}
          hint={
            data
              ? `${data.unattributedPending} sin atribuir a un flujo · ${data.pendingWithoutTenant} sin inquilino`
              : undefined
          }
        />
        <MetricCard
          label="Fallidos"
          value={data?.failed ?? "—"}
          tone={data?.failed ? "warning" : "success"}
        />
        <MetricCard
          label="Última pasada del consumidor"
          value={data ? fecha(data.consumer.lastRunAt, "Nunca") : "—"}
          hint={data?.consumer.running ? "Corre" : "Sin pasadas recientes"}
        />
      </div>
      {query.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo cargar el trabajo pendiente."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <section>
            <SectionHeader
              title="Flujos que encolan"
              description="Una fila por ruta que dejó trabajo encargado. Van primero las de pendiente más antiguo."
            />
            {data.truncated ? (
              <p role="status" className="mb-3 text-xs text-amber-800">
                {`Sólo se enseñan las ${data.limit ?? data.flows.length} rutas con el pendiente más antiguo: hay más que encolan trabajo. Los totales de arriba sí cuentan toda la cola de eventos.`}
              </p>
            ) : null}
            <FilterBar
              search={q}
              searchPlaceholder="Buscar por método, ruta o evento…"
              searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en el método, la ruta y los códigos de los eventos que encola cada flujo."
              onSearchChange={(value) => {
                setQ(value);
                setPage(1);
              }}
              onFilterChange={(_name, value) => {
                setState(value);
                setPage(1);
              }}
              onClear={() => {
                setQ("");
                setState("");
                setPage(1);
              }}
              filters={[
                {
                  name: "state",
                  label: "Situación",
                  value: state,
                  tooltip:
                    "Deja sólo las rutas con pendientes, con fallidos o cuyos pendientes el consumidor ha visto y dejado atrás.",
                  options: STATE_OPTIONS,
                },
              ]}
            />
            <DataTable
              data={data.flows}
              columns={serverColumns}
              meta={data.meta}
              onPageChange={setPage}
              emptyTitle={
                hayFiltro
                  ? "Ningún flujo coincide con la búsqueda o el filtro"
                  : "Ningún flujo encoló trabajo en la ventana"
              }
              emptyDescription={
                hayFiltro
                  ? "Quita el texto o el filtro para volver a ver todas las rutas."
                  : "No hay eventos de la cola atribuibles a una petición en estos días."
              }
            />
          </section>
          <section>
            <SectionHeader
              title="Eventos de dominio: quién los consume"
              description="Qué eventos de dominio acaban de verdad en un aviso."
            />
            {data.domainEvents ? (
              <DomainEventsTable domainEvents={data.domainEvents} />
            ) : (
              <p className="text-xs text-atlas-muted">
                Esta versión del servicio no informa quién consume cada evento
                de dominio. La pantalla sigue siendo útil sin ese bloque.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
