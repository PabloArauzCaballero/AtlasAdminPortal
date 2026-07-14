"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { SchemaChangeLog } from "./types";

function ApprovalStatusBadge({
  value,
}: Readonly<{ value: SchemaChangeLog["approvalStatus"] }>) {
  const tone =
    value === "approved"
      ? "success"
      : value === "rejected"
        ? "critical"
        : "warning";
  const labels = {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
  };
  return <Badge tone={tone}>{labels[value]}</Badge>;
}

export function buildChangeLogColumns(
  onDecide: (change: SchemaChangeLog) => void,
): ColumnDef<SchemaChangeLog>[] {
  return [
    {
      header: "Cambio",
      accessorKey: "changeId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">#{row.original.changeId}</span>
      ),
    },
    {
      header: "Tipo",
      accessorKey: "changeType",
      cell: ({ row }) => <Badge tone="info">{row.original.changeType}</Badge>,
    },
    {
      header: "Entidad",
      accessorKey: "affectedEntityType",
      cell: ({ row }) =>
        safeText(
          row.original.affectedEntityId ?? row.original.affectedEntityType,
        ),
    },
    {
      header: "Estado",
      accessorKey: "approvalStatus",
      cell: ({ row }) => (
        <ApprovalStatusBadge value={row.original.approvalStatus} />
      ),
    },
    {
      header: "Solicitante",
      accessorKey: "requesterPlatformUserId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          #{row.original.requesterPlatformUserId}
        </span>
      ),
    },
    {
      header: "Creado",
      accessorKey: "createdAt",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      header: "Acción",
      cell: ({ row }) => (
        <Button
          className="h-8 px-2 text-xs"
          disabled={row.original.approvalStatus !== "pending"}
          onClick={() => onDecide(row.original)}
        >
          Revisar
        </Button>
      ),
    },
  ];
}
