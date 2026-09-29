"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import type { Option } from "@/shared/lib/options";
import { approvalBlocker } from "./catalog-staging-logic";
import type { StagingItem } from "./catalog-staging-types";

/** «Propuesta» distingue lo que sugirió la IA de lo que trajo la ingesta tal cual. */
export const ORIGEN_PROPUESTA_OPTIONS: Option[] = [
  {
    value: "true",
    label: "Sugeridos por la IA",
    description: "Ítems que la IA propuso: conviene mirarlos con más cuidado.",
  },
  {
    value: "false",
    label: "Sin sugerencia de la IA",
    description: "Ítems que trajo el lote tal cual.",
  },
];

/**
 * Los ítems pendientes de una ingesta, con la casilla que arma el lote.
 *
 * La casilla conserva el nombre accesible «Seleccionar …» de siempre. `tope` cierra las casillas
 * libres cuando el lote ya llegó al máximo que admite el servidor: sin él, marcar la 501 no hacía
 * nada y no decía por qué.
 */
export function buildStagingColumns(seleccion: {
  seleccionado: (id: string) => boolean;
  alternar: (item: StagingItem) => void;
  tope: boolean;
}): ColumnDef<StagingItem>[] {
  return [
    {
      header: "",
      id: "seleccion",
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        const nombre =
          item.proposedItemName ?? item.proposedItemCode ?? "Sin nombre";
        const marcado = seleccion.seleccionado(item.stagingItemId);
        return (
          <input
            type="checkbox"
            checked={marcado}
            disabled={seleccion.tope && !marcado}
            aria-label={`Seleccionar ${nombre}`}
            onChange={() => seleccion.alternar(item)}
          />
        );
      },
    },
    {
      header: "Ítem propuesto",
      id: "item",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-atlas-text">
            {row.original.proposedItemName ??
              row.original.proposedItemCode ??
              "Sin nombre"}
          </p>
          <p className="font-mono text-xs text-atlas-muted">
            {row.original.proposedItemCode ?? "—"} · #
            {row.original.stagingItemId}
          </p>
        </div>
      ),
    },
    {
      header: "Propuesta",
      accessorKey: "aiSuggested",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.aiSuggested ? (
          <Badge tone="info">Sugerido por IA</Badge>
        ) : (
          <span className="text-xs text-atlas-muted">Del lote</span>
        ),
    },
    {
      header: "Aviso",
      id: "aviso",
      enableSorting: false,
      cell: ({ row }) => {
        const aviso = approvalBlocker(row.original);
        return aviso ? (
          <span className="text-xs text-amber-800">{aviso}</span>
        ) : (
          <span className="text-xs text-atlas-muted">—</span>
        );
      },
    },
  ];
}
