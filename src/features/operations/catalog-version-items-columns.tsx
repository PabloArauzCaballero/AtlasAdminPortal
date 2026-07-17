"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatBoolean, safeText } from "@/shared/lib/format";
import type { ContextItem } from "./catalog-version-types";

/**
 * Columnas de los items de una versión. Alias y mapeos de riesgo se muestran
 * como conteo con acceso al detalle: un item puede traer hasta 50 de cada uno y
 * aplanarlos en la tabla la vuelve ilegible.
 */
export function buildCatalogVersionItemColumns(
  onInspect: (item: ContextItem) => void,
): ColumnDef<ContextItem>[] {
  return [
    {
      header: "Código",
      accessorKey: "itemCode",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onInspect(row.original)}
          className="font-mono text-xs font-semibold text-blue-700 hover:underline"
        >
          {row.original.itemCode}
        </button>
      ),
    },
    {
      header: "Nombre",
      accessorKey: "itemName",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    { header: "Tipo", accessorKey: "itemType" },
    {
      header: "Confianza",
      accessorKey: "confidenceScore",
      cell: ({ row }) => safeText(row.original.confidenceScore),
    },
    {
      header: "Alias",
      id: "aliases",
      cell: ({ row }) => (
        <Badge tone={row.original.aliases.length > 0 ? "info" : "muted"}>
          {row.original.aliases.length}
        </Badge>
      ),
    },
    {
      header: "Mapeos de riesgo",
      id: "riskMappings",
      cell: ({ row }) => (
        <Badge
          tone={row.original.riskMappings.length > 0 ? "warning" : "muted"}
        >
          {row.original.riskMappings.length}
        </Badge>
      ),
    },
    {
      header: "Activo",
      accessorKey: "isActive",
      cell: ({ row }) => formatBoolean(row.original.isActive),
    },
  ];
}
