"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Hourglass } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { DomainEventsTable } from "./domain-events-table";
import { usePendingWork } from "./hooks";
import { DIAGNOSIS, fecha } from "./labels";
import type { PendingWorkFlow } from "./types";

const VENTANAS = [7, 30, 90];

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
  const query = usePendingWork(ventana);
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

  return (
    <>
      <PageHeader
        icon={Hourglass}
        eyebrow="Systems Ops · Flujos"
        title="Trabajo pendiente"
        description="Lo que cada flujo deja encargado al responder (eventos del outbox), si alguien lo recoge y qué eventos de dominio terminan de verdad en un aviso."
        actions={
          <select
            aria-label="Ventana"
            className="rounded-md border border-atlas-border bg-white px-2 py-1 text-sm"
            value={ventana}
            onChange={(event) => setVentana(Number(event.target.value))}
          >
            {VENTANAS.map((dias) => (
              <option key={dias} value={dias}>
                Últimos {dias} días
              </option>
            ))}
          </select>
        }
      />
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
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Flujos que encolan</h2>
            </CardHeader>
            <CardContent>
              <DataTable
                data={data.flows}
                columns={columns}
                emptyTitle="Ningún flujo encoló trabajo en la ventana"
                emptyDescription="No hay eventos del outbox atribuibles a una petición en estos días."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">
                Eventos de dominio: quién los consume
              </h2>
            </CardHeader>
            <CardContent>
              <DomainEventsTable domainEvents={data.domainEvents} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
