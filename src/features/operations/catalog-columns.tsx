"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { ContextCatalog } from "@/features/operations/types";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatBoolean, safeText } from "@/shared/lib/format";

/** Columnas del inventario de catálogos (paginado en el servidor: sin orden de cliente). */
export function buildCatalogColumns(actions: {
  onCreateVersion: (catalogCode: string) => void;
  onIngest: (catalog: ContextCatalog) => void;
}): ColumnDef<ContextCatalog>[] {
  return withoutClientSorting<ContextCatalog>([
    {
      header: "Código",
      accessorKey: "catalogCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          {row.original.catalogCode}
        </span>
      ),
    },
    {
      header: "Catálogo",
      accessorKey: "catalogName",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.catalogName}</span>
      ),
    },
    {
      header: "Dominio",
      accessorKey: "domain",
      cell: ({ row }) => safeText(row.original.domain),
    },
    {
      header: "Dueño",
      accessorKey: "ownerTeam",
      cell: ({ row }) => safeText(row.original.ownerTeam),
    },
    {
      header: "Activo",
      accessorKey: "isActive",
      cell: ({ row }) => formatBoolean(row.original.isActive),
    },
    {
      header: "Versión",
      id: "version",
      // `currentVersion` es la versión MÁS RECIENTE del catálogo (el backend
      // la resuelve con `findLatestVersionsByCatalogIds`, ordenando por
      // validFrom DESC, id DESC), no solo la publicada. Por eso un borrador
      // recién creado es alcanzable desde acá: este enlace es la entrada al
      // flujo de aprobación.
      cell: ({ row }) => {
        const version = row.original.currentVersion;
        if (!version) return safeText(null);
        return (
          <Link
            href={`/internal/operations/catalogs/${row.original.catalogCode}/versions/${version.catalogVersionId}`}
            className="font-mono text-xs font-semibold text-atlas-accent underline"
          >
            {version.versionCode}
          </Link>
        );
      },
    },
    {
      header: "Estado",
      id: "status",
      cell: ({ row }) => (
        <StatusBadge
          value={row.original.currentVersion?.status ?? "sin_version"}
        />
      ),
    },
    {
      header: "Acciones",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            className="h-7 px-2 text-xs"
            onClick={() => actions.onCreateVersion(row.original.catalogCode)}
          >
            Nueva versión
          </Button>
          <Button
            className="h-7 px-2 text-xs"
            onClick={() => actions.onIngest(row.original)}
          >
            Ingerir
          </Button>
        </div>
      ),
    },
  ]);
}
