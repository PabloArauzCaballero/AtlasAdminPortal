"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { LocalListTable } from "@/shared/components/data-table/local-list-table";
import { formatNumber } from "@/shared/lib/format";

type UnassignedModule = { module: string; tables: number };

const COLUMNS: ColumnDef<UnassignedModule>[] = [
  {
    header: "Módulo",
    accessorKey: "module",
    cell: ({ row }) => (
      <Link
        href={`/internal/data-catalog/tables?q=${encodeURIComponent(row.original.module)}`}
        className="font-mono text-xs text-atlas-accent underline"
      >
        {row.original.module}
      </Link>
    ),
  },
  {
    header: "Tablas sin dominio",
    accessorKey: "tables",
    cell: ({ row }) => formatNumber(row.original.tables),
  },
];

/** Los módulos con tablas todavía sin dominio, con enlace al catálogo filtrado por el módulo. */
export function UnassignedModulesTable({
  modules,
}: Readonly<{ modules: UnassignedModule[] }>) {
  return (
    <LocalListTable
      rows={modules}
      columns={COLUMNS}
      searchText={(entry) => entry.module}
      searchPlaceholder="Buscar por módulo…"
      searchTooltip="Recorre los módulos con tablas sin clasificar, que llegan todos del servidor: coincide con parte del nombre del módulo."
      emptyTitle="Todas las tablas tienen dominio."
      emptyFilteredTitle="Ningún módulo coincide con la búsqueda."
    />
  );
}
