import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import { formatJobDuration, jobDisplayName, jobQueueLabel } from "./labels";
import type { JobRunSummary } from "./types";

export function buildJobRunColumns(): ColumnDef<JobRunSummary>[] {
  return [
    {
      accessorKey: "name",
      header: "Proceso",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-atlas-text">
            {jobDisplayName(row.original.jobKey, row.original.name)}
          </p>
          <p className="font-mono text-xs text-atlas-muted">
            {row.original.jobKey}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "queue",
      header: "Origen",
      cell: ({ row }) => jobQueueLabel(row.original.queue),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      accessorKey: "durationMs",
      header: "Duración",
      cell: ({ row }) => formatJobDuration(row.original.durationMs),
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
