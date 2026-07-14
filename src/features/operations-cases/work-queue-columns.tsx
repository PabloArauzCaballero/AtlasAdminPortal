"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  Badge,
  SeverityBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { WorkQueueItem } from "./types";

function WorkItemTypeBadge({
  value,
}: Readonly<{ value: WorkQueueItem["workItemType"] }>) {
  return (
    <Badge tone={value === "fraud" ? "critical" : "info"}>
      {value === "fraud" ? "Fraude" : "Revisión manual"}
    </Badge>
  );
}

export function buildWorkQueueColumns(
  onDecide: (item: WorkQueueItem) => void,
): ColumnDef<WorkQueueItem>[] {
  return [
    {
      header: "Tipo",
      accessorKey: "workItemType",
      cell: ({ row }) => (
        <WorkItemTypeBadge value={row.original.workItemType} />
      ),
    },
    {
      header: "Caso",
      accessorKey: "caseCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.caseCode)} #{row.original.caseId}
        </span>
      ),
    },
    {
      header: "Cliente",
      accessorKey: "customerId",
      cell: ({ row }) =>
        row.original.customerId ? (
          <Link
            href={`/internal/operations/customers/${row.original.customerId}/investigation-summary`}
            className="font-mono text-xs text-blue-700 hover:underline"
          >
            #{row.original.customerId}
          </Link>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Prioridad",
      accessorKey: "priority",
      cell: ({ row }) => <SeverityBadge value={row.original.priority} />,
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      header: "Motivo",
      accessorKey: "reasonCode",
      cell: ({ row }) => safeText(row.original.reasonCode),
    },
    {
      header: "Abierto",
      accessorKey: "openedAt",
      cell: ({ row }) => formatDateTime(row.original.openedAt),
    },
    {
      header: "Acción",
      cell: ({ row }) => {
        const closed = ["closed", "resolved"].includes(
          (row.original.status ?? "").toLowerCase(),
        );
        return (
          <Button
            className="h-8 px-2 text-xs"
            disabled={closed}
            title={closed ? "Este caso ya está cerrado." : undefined}
            onClick={() => onDecide(row.original)}
          >
            Decidir
          </Button>
        );
      },
    },
  ];
}
