"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge, BooleanBadge } from "@/shared/components/ui/badges";
import { formatNumber, safeText } from "@/shared/lib/format";
import type { SchemaTable } from "./types";

export function buildSchemaTableColumns(): ColumnDef<SchemaTable>[] {
  return [
    {
      header: "Tabla",
      accessorKey: "tableName",
      cell: ({ row }) => (
        <Link
          href={`/internal/schema/tables/${row.original._id}`}
          className="font-mono text-xs text-blue-700 underline"
        >
          {row.original.tableName}
        </Link>
      ),
    },
    {
      header: "Tipo",
      accessorKey: "tableType",
      cell: ({ row }) => <Badge tone="info">{row.original.tableType}</Badge>,
    },
    {
      header: "Append-only",
      accessorKey: "isAppendOnly",
      cell: ({ row }) => <BooleanBadge value={row.original.isAppendOnly} />,
    },
    {
      header: "Multi-tenant",
      accessorKey: "isTenantScoped",
      cell: ({ row }) => <BooleanBadge value={row.original.isTenantScoped} />,
    },
    {
      header: "Columnas",
      accessorKey: "columnsCount",
      cell: ({ row }) => formatNumber(row.original.columnsCount),
    },
    {
      header: "Relaciones",
      accessorKey: "relationshipsCount",
      cell: ({ row }) => formatNumber(row.original.relationshipsCount),
    },
    {
      header: "Descripción",
      accessorKey: "description",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-xs">
          {safeText(row.original.description)}
        </span>
      ),
    },
  ];
}
