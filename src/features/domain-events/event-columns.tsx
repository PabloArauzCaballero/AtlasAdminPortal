import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import type { DomainEventSummary } from "./types";
import { EventRowActions } from "./event-actions";

export function buildDomainEventColumns(): ColumnDef<DomainEventSummary>[] {
  return [
    {
      accessorKey: "eventCode",
      header: "Evento",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-atlas-text">{row.original.eventCode}</p>
          <p className="font-mono text-xs text-atlas-muted">
            {row.original.aggregateType ?? "—"}
            {row.original.aggregateId ? ` · ${row.original.aggregateId}` : ""}
          </p>
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
      accessorKey: "correlationId",
      header: "Correlación",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.correlationId ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => <EventRowActions event={row.original} />,
    },
  ];
}
