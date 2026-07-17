"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { sourceTableLabel } from "./source-table-labels";
import type { CustomerAuditFeedEvent } from "./types";

export function buildCustomerAuditFeedColumns(): ColumnDef<CustomerAuditFeedEvent>[] {
  return [
    {
      header: "Fecha",
      accessorKey: "occurredAt",
      cell: ({ row }) => formatDateTime(row.original.occurredAt),
    },
    {
      header: "Fuente",
      accessorKey: "sourceTable",
      cell: ({ row }) => (
        <Badge tone="info">{sourceTableLabel(row.original.sourceTable)}</Badge>
      ),
    },
    {
      // `eventType` del feed viene crudo de cada fuente (para la auditoría
      // operativa es el `action_code`), así que se muestra literal en vez de
      // traducirlo: cualquier mapa de etiquetas mentiría sobre valores nuevos.
      header: "Evento",
      accessorKey: "eventType",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.eventType)}
        </span>
      ),
    },
    {
      header: "Actor",
      accessorKey: "actorType",
      cell: ({ row }) => safeText(row.original.actorType),
    },
    {
      header: "Objetivo",
      accessorKey: "targetId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.targetType)}
          {row.original.targetId ? ` #${row.original.targetId}` : ""}
        </span>
      ),
    },
  ];
}
