"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { eventTypeLabel } from "./source-table-labels";
import type { CustomerAuditEvent } from "./types";

export function buildCustomerAuditEventsColumns(): ColumnDef<CustomerAuditEvent>[] {
  return [
    {
      header: "Fecha",
      accessorKey: "occurredAt",
      cell: ({ row }) => formatDateTime(row.original.occurredAt),
    },
    {
      header: "Tipo",
      accessorKey: "eventType",
      cell: ({ row }) => (
        <Badge tone="info">{eventTypeLabel(row.original.eventType)}</Badge>
      ),
    },
    {
      header: "Actor",
      accessorKey: "actorType",
      cell: ({ row }) => safeText(row.original.actorType),
    },
    {
      header: "Resumen",
      accessorKey: "summary",
      cell: ({ row }) => (
        <span className="text-sm">{safeText(row.original.summary)}</span>
      ),
    },
  ];
}
