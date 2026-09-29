"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime } from "@/shared/lib/format";
import type { PartnerContractTemplate } from "./types";

/**
 * Columnas de la tabla de versiones del contrato. La tabla pagina en el servidor, así que ninguna
 * columna se ofrece ordenable: reordenar sólo la página cargada prometería un orden global.
 *
 * No hay «Editar» a propósito: un contrato es la evidencia de a qué se comprometió alguien un día
 * concreto, y editarlo en sitio borraría el texto que un comercio aceptó de verdad.
 */
export function buildContractColumns({
  onView,
  onMarkDefault,
}: {
  onView: (template: PartnerContractTemplate) => void;
  /** Ausente = quien mira no puede gestionar. */
  onMarkDefault?: (template: PartnerContractTemplate) => void;
}): ColumnDef<PartnerContractTemplate>[] {
  return [
    {
      header: "Contrato",
      enableSorting: false,
      accessorKey: "name",
      cell: ({ row }) => (
        <div
          className="max-w-xs"
          data-testid={`contrato-${row.original.templateId}`}
        >
          <p className="text-sm font-semibold text-atlas-text">
            {row.original.name}
          </p>
          <p className="font-mono text-xs uppercase text-atlas-muted">
            {row.original.templateCode}
          </p>
        </div>
      ),
    },
    {
      header: "Versión",
      enableSorting: false,
      accessorKey: "version",
      cell: ({ row }) => (
        <span className="font-mono text-xs">v{row.original.version}</span>
      ),
    },
    {
      header: "Estado",
      enableSorting: false,
      accessorKey: "status",
      cell: ({ row }) =>
        row.original.isDefault ? (
          <StatusBadge value="VIGENTE" />
        ) : (
          <StatusBadge value={row.original.status} />
        ),
    },
    {
      header: "En vigor desde",
      enableSorting: false,
      accessorKey: "effectiveFrom",
      cell: ({ row }) =>
        row.original.effectiveFrom
          ? formatDateTime(row.original.effectiveFrom)
          : "Sin fecha de vigencia",
    },
    {
      header: "Texto",
      enableSorting: false,
      accessorKey: "body",
      cell: ({ row }) => (
        <span className="line-clamp-2 block max-w-sm whitespace-pre-wrap text-xs text-atlas-muted">
          {row.original.body}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true },
      cell: ({ row }) => {
        const template = row.original;
        return (
          <div className="flex gap-2">
            <Button
              className="h-8 px-2 text-xs"
              onClick={() => onView(template)}
            >
              Ver texto
            </Button>
            {/* Revivir un texto archivado desharía la retirada de quien tuvo un motivo para retirarlo. */}
            {onMarkDefault &&
            !template.isDefault &&
            template.status === "active" ? (
              <Button
                className="h-8 px-2 text-xs"
                onClick={() => onMarkDefault(template)}
              >
                Marcar como vigente
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];
}
