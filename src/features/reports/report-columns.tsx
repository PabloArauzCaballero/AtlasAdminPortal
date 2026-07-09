"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { ReportDefinition, ReportSnapshot } from "./types";

export function buildReportColumns(): ColumnDef<ReportDefinition>[] {
  return [
    {
      header: "Reporte",
      accessorKey: "name",
      cell: ({ row }) => (
        <Link
          className="font-medium text-blue-700 hover:underline"
          href={`/internal/reports/${row.original.reportId}`}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      header: "Código",
      accessorKey: "key",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.key}</span>
      ),
    },
    { header: "Dominio", accessorKey: "domain" },
    { header: "Dueño", accessorKey: "owner" },
    {
      header: "Criticidad",
      accessorKey: "criticality",
      cell: ({ row }) => <RiskBadge value={row.original.criticality} />,
    },
    {
      header: "Fuente",
      accessorKey: "sourceType",
      cell: ({ row }) => safeText(row.original.sourceType),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      header: "Actualizado",
      accessorKey: "updatedAt",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
  ];
}

export function buildSnapshotColumns(): ColumnDef<ReportSnapshot>[] {
  return [
    {
      header: "Snapshot",
      accessorKey: "snapshotId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.snapshotId}</span>
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    { header: "Generado por", accessorKey: "generatedBy" },
    {
      header: "Generado",
      accessorKey: "generatedAt",
      cell: ({ row }) => formatDateTime(row.original.generatedAt),
    },
  ];
}
