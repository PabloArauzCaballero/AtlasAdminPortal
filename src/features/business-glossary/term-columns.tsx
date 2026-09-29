"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { BusinessTerm } from "./types";

const TERM_TYPE_LABELS: Record<string, string> = {
  domain: "Dominio",
  table: "Tabla",
  field: "Campo",
};

/** El tipo lo declara el servidor; con un Core anterior se deduce del prefijo del identificador. */
function termType(term: BusinessTerm): string {
  return term.type ?? term.termId.split(":")[0] ?? "";
}

export function buildBusinessTermColumns(): ColumnDef<BusinessTerm>[] {
  return [
    {
      header: "Término",
      accessorKey: "name",
      cell: ({ row }) => (
        <Link
          className="font-semibold text-atlas-accent underline"
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
    {
      header: "Tipo",
      id: "type",
      cell: ({ row }) => TERM_TYPE_LABELS[termType(row.original)] ?? "—",
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
      header: "Tablas",
      id: "relatedTables",
      cell: ({ row }) => <RelatedCount items={row.original.relatedTables} />,
    },
    {
      header: "Columnas",
      id: "relatedColumns",
      cell: ({ row }) => <RelatedCount items={row.original.relatedColumns} />,
    },
    {
      header: "Operaciones",
      id: "relatedEndpoints",
      cell: ({ row }) => <RelatedCount items={row.original.relatedEndpoints} />,
    },
    {
      header: "Actualizado",
      accessorKey: "updatedAt",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
  ];
}

function RelatedCount({ items }: Readonly<{ items?: string[] }>) {
  if (!items?.length) return <span className="text-atlas-muted">0</span>;
  return (
    <span title={items.join(", ")} className="font-medium">
      {items.length}
    </span>
  );
}
