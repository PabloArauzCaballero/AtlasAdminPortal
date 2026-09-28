import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/shared/components/ui/button";
import { formatNumber } from "@/shared/lib/format";
import type { DataExportSummary } from "./types";

export function buildDataExportColumns(): ColumnDef<DataExportSummary>[] {
  return [
    {
      accessorKey: "name",
      header: "Catálogo",
      cell: ({ row }) => (
        <p className="font-medium text-atlas-text">{row.original.name}</p>
      ),
    },
    {
      id: "rows",
      header: "Filas",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatNumber(row.original.metadata?.rows ?? 0)}
        </span>
      ),
    },
    {
      id: "reason",
      header: "Para qué sirve",
      cell: ({ row }) => row.original.metadata?.reason ?? "—",
    },
    { accessorKey: "format", header: "Formato" },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <Link
          href={`/internal/exports/${encodeURIComponent(row.original.exportId)}`}
        >
          <Button>Ver</Button>
        </Link>
      ),
    },
  ];
}
