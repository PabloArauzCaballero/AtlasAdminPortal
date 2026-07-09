"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatBoolean, formatDateTime, safeText } from "@/shared/lib/format";
import type { GovernancePolicyDetail } from "./types";

type Control = NonNullable<GovernancePolicyDetail["controls"]>[number];
type Approval = NonNullable<GovernancePolicyDetail["approvals"]>[number];
type Action = NonNullable<GovernancePolicyDetail["actions"]>[number];

export function buildControlColumns(): ColumnDef<Control>[] {
  return [
    { header: "Tipo", accessorKey: "controlType" },
    { header: "Control", accessorKey: "label" },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      header: "Regla",
      accessorKey: "config",
      cell: ({ row }) => summarizeControlConfig(row.original.config),
    },
  ];
}

export function buildActionColumns(): ColumnDef<Action>[] {
  return [
    { header: "Acción", accessorKey: "name" },
    {
      header: "Operación",
      accessorKey: "operation",
      cell: ({ row }) => safeText(row.original.operation),
    },
    {
      header: "Activa",
      accessorKey: "enabled",
      cell: ({ row }) => formatBoolean(Boolean(row.original.enabled)),
    },
    {
      header: "Aprobación",
      accessorKey: "requiresApproval",
      cell: ({ row }) => formatBoolean(Boolean(row.original.requiresApproval)),
    },
    {
      header: "Motivo",
      accessorKey: "requiresReason",
      cell: ({ row }) => formatBoolean(Boolean(row.original.requiresReason)),
    },
    {
      header: "Auditoría",
      accessorKey: "requiresAudit",
      cell: ({ row }) => formatBoolean(Boolean(row.original.requiresAudit)),
    },
  ];
}

export function buildApprovalColumns(): ColumnDef<Approval>[] {
  return [
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    { header: "Actor", accessorKey: "actor" },
    {
      header: "Fecha",
      accessorKey: "decidedAt",
      cell: ({ row }) => formatDateTime(row.original.decidedAt),
    },
    {
      header: "Comentario",
      accessorKey: "comment",
      cell: ({ row }) => safeText(row.original.comment),
    },
  ];
}

function summarizeControlConfig(value: Record<string, unknown> | null) {
  if (!value) return "—";
  const entries = Object.entries(value).slice(0, 4);
  if (entries.length === 0) return "—";
  return entries.map(([key, item]) => `${key}: ${safeText(item)}`).join(" · ");
}
