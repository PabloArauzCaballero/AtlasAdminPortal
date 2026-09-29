"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { changeTypeLabel, type SchemaChangeLog } from "./types";
import { requesterLabel } from "./change-actor";

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
  canApprove: boolean,
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
      cell: ({ row }) => (
        <Badge tone="info">{changeTypeLabel(row.original.changeType)}</Badge>
      ),
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
      id: "requester",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {requesterLabel(row.original)}
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
          disabled={row.original.approvalStatus !== "pending" || !canApprove}
          title={
            canApprove
              ? undefined
              : "Necesitas permiso para aprobar cambios de esquema"
          }
          onClick={() => onDecide(row.original)}
        >
          Revisar
        </Button>
      ),
    },
  ];
}
