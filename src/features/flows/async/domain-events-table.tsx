"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { CONSUMER, fecha } from "./labels";
import type { PendingWorkResponse, DomainEventRow } from "./types";

/**
 * Qué eventos de dominio acaban en un aviso, probado por el vínculo real mensaje → evento y por la
 * entrega. Las cuatro cuentas van separadas a propósito: «tiene mensaje» no es «le llegó a alguien».
 */
export function DomainEventsTable({
  domainEvents,
}: Readonly<{ domainEvents: PendingWorkResponse["domainEvents"] }>) {
  const columns = useMemo<ColumnDef<DomainEventRow>[]>(
    () => [
      {
        header: "Desenlace",
        accessorKey: "consumer",
        cell: ({ row }) => {
          const etiqueta = CONSUMER[row.original.consumer];
          return (
            <span title={etiqueta.hint}>
              <Badge tone={etiqueta.tone} dot>
                {etiqueta.label}
              </Badge>
            </span>
          );
        },
      },
      {
        header: "Evento",
        accessorKey: "eventCode",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.eventCode}</span>
        ),
      },
      {
        header: "Agregado",
        accessorKey: "aggregateTypes",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.aggregateTypes.join(", ")}
          </span>
        ),
      },
      { header: "Eventos", accessorKey: "events" },
      { header: "Procesados", accessorKey: "processed" },
      { header: "Con mensaje", accessorKey: "eventsWithMessage" },
      { header: "Mensajes", accessorKey: "messages" },
      { header: "Salieron", accessorKey: "messagesSent" },
      {
        header: "Registrado",
        accessorKey: "registered",
        cell: ({ row }) => (row.original.registered ? "Sí" : "No"),
      },
      {
        header: "Último",
        accessorKey: "lastEventAt",
        cell: ({ row }) => (
          <span className="text-xs">{fecha(row.original.lastEventAt)}</span>
        ),
      },
    ],
    [],
  );
  return (
    <>
      <p className="mb-3 text-xs text-atlas-muted">
        Ventana de {domainEvents.windowDays} días
        {domainEvents.clampedByRetention
          ? " (recortada a la retención del outbox: más atrás ya se purgaron los procesados)"
          : ""}
        . Se clasifica contra el registro de eventos actual.
        {domainEvents.truncated
          ? " La consulta vino cortada: faltan códigos."
          : ""}
      </p>
      <DataTable
        data={domainEvents.rows}
        columns={columns}
        emptyTitle="Sin eventos de dominio en la ventana"
        emptyDescription="Ningún flujo publicó eventos de dominio en estos días."
      />
    </>
  );
}
