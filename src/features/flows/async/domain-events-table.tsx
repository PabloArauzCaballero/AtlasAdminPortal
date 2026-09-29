"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { CONSUMER, fecha } from "./labels";
import type {
  DomainEventConsumer,
  DomainEventRow,
  PendingWorkResponse,
} from "./types";

/**
 * Qué eventos de dominio acaban en un aviso, probado por el vínculo real mensaje → evento y por la
 * entrega. Las cuatro cuentas van separadas a propósito: «tiene mensaje» no es «le llegó a alguien».
 */
const FILTERS: LocalListFilter<DomainEventRow>[] = [
  {
    name: "consumer",
    label: "Desenlace",
    tooltip:
      "Deja sólo los eventos con ese desenlace: avisan, generan mensajes que no salen, no están registrados…",
    options: (Object.keys(CONSUMER) as DomainEventConsumer[]).map((value) => ({
      value,
      label: CONSUMER[value].label,
      description: CONSUMER[value].hint,
    })),
    test: (row, value) => row.consumer === value,
  },
  {
    name: "registered",
    label: "Registro",
    tooltip:
      "Separa los eventos que están en el registro actual de eventos de los que no.",
    options: [
      {
        value: "yes",
        label: "Registrados",
        description: "El código está en el registro de eventos actual.",
      },
      {
        value: "no",
        label: "No registrados",
        description: "El código ya no está —o nunca estuvo— en el registro.",
      },
    ],
    test: (row, value) => (value === "yes") === row.registered,
  },
];

export function DomainEventsTable({
  domainEvents,
}: Readonly<{
  domainEvents: NonNullable<PendingWorkResponse["domainEvents"]>;
}>) {
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
          ? " (recortada a lo que guarda la cola de eventos: más atrás ya se borraron los procesados)"
          : ""}
        . Se clasifica contra el registro de eventos actual.
        {domainEvents.truncated
          ? " La consulta vino cortada: faltan códigos."
          : ""}
      </p>
      <LocalListTable
        rows={domainEvents.rows}
        columns={columns}
        searchText={(row) => `${row.eventCode} ${row.aggregateTypes.join(" ")}`}
        searchPlaceholder="Buscar por evento o agregado…"
        searchTooltip="Recorre todos los códigos de evento de la ventana, que llegan enteros del servidor (la lista de arriba avisa si vino cortada): coincide con parte del código del evento o del tipo de agregado."
        filters={FILTERS}
        emptyTitle="Sin eventos de dominio en la ventana"
        emptyDescription="Ningún flujo publicó eventos de dominio en estos días."
        emptyFilteredTitle="Ningún evento coincide con la búsqueda."
      />
    </>
  );
}
