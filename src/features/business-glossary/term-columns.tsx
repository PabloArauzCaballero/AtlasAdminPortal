"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { BusinessTerm } from "./types";

export function buildBusinessTermColumns(): ColumnDef<BusinessTerm>[] {
  return [
    {
      header: "Término",
      accessorKey: "name",
      cell: ({ row }) => (
        <Link
          className="font-semibold text-blue-700 hover:underline"
          href={`/internal/business-metadata/glossary/${row.original.termId}`}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      header: "Clave",
      accessorKey: "key",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.key}</span>
      ),
    },
    { header: "Dominio", accessorKey: "domain" },
    { header: "Dueño", accessorKey: "owner" },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      header: "Definición",
      accessorKey: "definition",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-sm">
          {safeText(row.original.definition)}
        </span>
      ),
    },
    {
      header: "Actualizado",
      accessorKey: "updatedAt",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
  ];
}
