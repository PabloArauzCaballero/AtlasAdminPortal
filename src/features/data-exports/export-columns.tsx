import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import type { DataExportSummary } from "./types";

export function buildDataExportColumns(): ColumnDef<DataExportSummary>[] {
  return [
    {
      accessorKey: "name",
      header: "Exportación",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-atlas-text">{row.original.name}</p>
          <p className="text-xs text-atlas-muted">
            {row.original.resourceType} · {row.original.format}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    { accessorKey: "requestedBy", header: "Solicitado por" },
    {
      accessorKey: "requestedAt",
      header: "Solicitado",
      cell: ({ row }) => formatDateTime(row.original.requestedAt),
    },
    {
      accessorKey: "finishedAt",
      header: "Finalizado",
      cell: ({ row }) => formatDateTime(row.original.finishedAt),
    },
    {
      accessorKey: "expiresAt",
      header: "Expira",
      cell: ({ row }) => formatDateTime(row.original.expiresAt),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <Link href={`/internal/exports/${row.original.exportId}`}>
          <Button>Ver</Button>
        </Link>
      ),
    },
  ];
}
