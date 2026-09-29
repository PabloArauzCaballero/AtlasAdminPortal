"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  MethodBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { safeText } from "@/shared/lib/format";
import type { GlobalSearchResult } from "./types";

/**
 * Columnas de los resultados de una pestaña. El servidor pagina y ordena por relevancia, así que
 * ninguna columna se ofrece ordenable: reordenar sólo la página cargada prometería un orden global.
 */
export function buildSearchResultColumns(
  kindLabel: (kind: string) => string,
): ColumnDef<GlobalSearchResult>[] {
  return [
    {
      header: "Tipo",
      enableSorting: false,
      accessorKey: "kind",
      cell: ({ row }) => (
        <span className="text-xs font-semibold uppercase tracking-wide text-atlas-muted">
          {kindLabel(row.original.kind)}
        </span>
      ),
    },
    {
      header: "Resultado",
      enableSorting: false,
      accessorKey: "title",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-atlas-text">
          {row.original.title}
        </span>
      ),
    },
    {
      header: "Detalle",
      enableSorting: false,
      accessorKey: "subtitle",
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-md text-sm text-atlas-muted">
          {safeText(row.original.subtitle)}
        </span>
      ),
    },
    {
      header: "Método",
      enableSorting: false,
      accessorKey: "method",
      cell: ({ row }) =>
        row.original.method ? (
          <MethodBadge method={row.original.method} />
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Riesgo",
      enableSorting: false,
      accessorKey: "riskLevel",
      cell: ({ row }) =>
        row.original.riskLevel ? (
          <RiskBadge value={row.original.riskLevel} />
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Estado",
      enableSorting: false,
      accessorKey: "status",
      cell: ({ row }) =>
        row.original.status ? (
          <StatusBadge value={row.original.status} />
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Datos personales",
      enableSorting: false,
      accessorKey: "containsPii",
      cell: ({ row }) =>
        typeof row.original.containsPii === "boolean" ? (
          <PiiBadge value={row.original.containsPii} />
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      id: "abrir",
      header: "Abrir",
      enableSorting: false,
      meta: { pinRight: true },
      cell: ({ row }) =>
        // Sin destino seguro el resultado sigue informando, pero no navega.
        row.original.href ? (
          <Link
            href={row.original.href}
            className="text-xs font-medium text-atlas-accent underline"
          >
            Abrir
          </Link>
        ) : (
          <span className="text-xs text-atlas-muted">Sin pantalla</span>
        ),
    },
  ];
}
