import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import type { DomainEventSummary } from "./types";
import { EventRowActions } from "./event-actions";

/**
 * Las columnas del outbox.
 *
 * Eran OCHO y la tabla desbordaba: la última —la de las acciones— quedaba fuera de la pantalla, así
 * que las filas parecían no tener ninguna. Se llega arrastrando en horizontal, pero nadie arrastra
 * lo que no sabe que existe. Se corrige por los dos lados: la correlación baja a la celda del
 * evento (es un identificador que se copia, no se compara entre filas) y la columna de acciones se
 * clava a la derecha. Lo comprueba `operaciones.evidencia.spec.ts`: si una tabla desborda, su
 * última cabecera tiene que ser `position: sticky`.
 */
export function buildDomainEventColumns(): ColumnDef<DomainEventSummary>[] {
  return [
    {
      accessorKey: "eventCode",
      header: "Evento",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-atlas-text">
            {row.original.eventCode}
          </p>
          <p className="font-mono text-xs text-atlas-muted">
            {row.original.aggregateType ?? "—"}
            {row.original.aggregateId ? ` · ${row.original.aggregateId}` : ""}
          </p>
          {row.original.correlationId ? (
            <p className="font-mono text-[11px] text-atlas-muted">
              {`corr ${row.original.correlationId}`}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      id: "intentos",
      header: "Intentos",
      /* Los dos números juntos: «2» no dice nada, «2 / 3» dice que queda un intento. */
      cell: ({ row }) =>
        `${formatNumber(row.original.attempts)} / ${formatNumber(row.original.maxAttempts)}`,
    },
    {
      accessorKey: "availableAt",
      header: "Disponible",
      cell: ({ row }) => formatDateTime(row.original.availableAt),
    },
    {
      accessorKey: "processedAt",
      header: "Procesado",
      cell: ({ row }) => formatDateTime(row.original.processedAt),
    },
    {
      accessorKey: "lastError",
      header: "Último error",
      cell: ({ row }) => (
        <span className="text-xs text-atlas-muted">
          {row.original.errorCode ?? row.original.lastError ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => <EventRowActions event={row.original} />,
    },
  ];
}
