"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import type { SchemaVersion } from "./types";

export function buildSchemaVersionColumns(): ColumnDef<SchemaVersion>[] {
  return [
    {
      header: "Versión",
      accessorKey: "versionCode",
      cell: ({ row }) => (
        <Link
          href={`/internal/schema/versions/${row.original._id}`}
          className="font-mono text-xs text-atlas-accent underline"
        >
          {row.original.versionCode}
        </Link>
      ),
    },
    {
      header: "Estado",
      accessorKey: "isActive",
      cell: ({ row }) => (
        <Badge tone={row.original.isActive ? "success" : "muted"}>
          {row.original.isActive ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      header: "Tablas",
      accessorKey: "tablesCount",
      cell: ({ row }) => (
        <Link
          href={`/internal/schema/versions/${row.original._id}`}
          className="text-atlas-accent underline"
          aria-label={`Ver las ${formatNumber(row.original.tablesCount)} tablas de ${row.original.versionCode}`}
        >
          {formatNumber(row.original.tablesCount)}
        </Link>
      ),
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
      header: "Notas",
      accessorKey: "notes",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-xs">
          {safeText(row.original.notes)}
        </span>
      ),
    },
    {
      header: "Creada",
      accessorKey: "createdAt",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
  ];
}
