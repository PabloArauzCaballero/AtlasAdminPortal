import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import type { JobRunSummary } from "./types";

export function buildJobRunColumns(): ColumnDef<JobRunSummary>[] {
  return [
    {
      accessorKey: "name",
      header: "Job",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-atlas-text">{row.original.name}</p>
          <p className="font-mono text-xs text-atlas-muted">
            {row.original.jobKey}
          </p>
        </div>
      ),
    },
    { accessorKey: "queue", header: "Cola" },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    { accessorKey: "priority", header: "Prioridad" },
    {
      accessorKey: "attempts",
      header: "Intentos",
      cell: ({ row }) => formatNumber(row.original.attempts),
    },
    {
      accessorKey: "durationMs",
      header: "Duración ms",
      cell: ({ row }) => formatNumber(row.original.durationMs),
    },
    {
      accessorKey: "createdAt",
      header: "Creado",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <Link href={`/internal/jobs/${row.original.jobRunId}`}>
          <Button>Ver</Button>
        </Link>
      ),
    },
  ];
}
