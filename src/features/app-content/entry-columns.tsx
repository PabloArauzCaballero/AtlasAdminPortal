"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { APP_CONTENT_MANAGE } from "./surfaces";
import type { AppContentEntry } from "./types";

/**
 * Columnas de la tabla de piezas de contenido. La tabla pagina en el servidor, así que ninguna
 * columna se ofrece ordenable: reordenar sólo la página cargada prometería un orden global.
 */
export function buildEntryColumns(
  onEdit: (entry: AppContentEntry) => void,
): ColumnDef<AppContentEntry>[] {
  return [
    {
      header: "Pieza",
      enableSorting: false,
      accessorKey: "title",
      cell: ({ row }) => (
        <div
          className="max-w-xs"
          data-testid={`app-content-${row.original.contentKey}`}
        >
          <p className="text-sm font-semibold text-atlas-text">
            {row.original.title ?? row.original.contentKey}
          </p>
          <p className="font-mono text-xs text-atlas-muted">
            {row.original.contentKey} · {row.original.locale}
          </p>
        </div>
      ),
    },
    {
      header: "Orden",
      enableSorting: false,
      accessorKey: "displayOrder",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.displayOrder}</span>
      ),
    },
    {
      header: "Texto",
      enableSorting: false,
      accessorKey: "bodyMd",
      cell: ({ row }) => {
        const { subtitle, bodyMd, bullets } = row.original;
        if (!subtitle && !bodyMd && bullets.length === 0) {
          return <span className="text-atlas-muted">—</span>;
        }
        return (
          <div className="max-w-md space-y-0.5 text-xs">
            {subtitle ? <p className="text-atlas-text">{subtitle}</p> : null}
            {bodyMd ? (
              <p className="line-clamp-2 whitespace-pre-wrap text-atlas-muted">
                {bodyMd}
              </p>
            ) : null}
            {bullets.length > 0 ? (
              <p className="text-atlas-muted">
                {bullets.length === 1 ? "1 punto" : `${bullets.length} puntos`}
                {bullets.some((bullet) => bullet.emphasis)
                  ? " · con destacado"
                  : ""}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Botón",
      enableSorting: false,
      accessorKey: "resolvedAction",
      // Se enseña el enlace RESUELTO y no el número suelto: es lo que la app abre de verdad, y
      // comprobar aquí que el prefijo del país quedó bien evita descubrirlo cuando un cliente
      // escriba a un número que no existe.
      cell: ({ row }) =>
        row.original.resolvedAction ? (
          <div className="flex max-w-xs flex-wrap items-baseline gap-1.5 text-xs">
            <span className="font-medium text-atlas-text">
              {row.original.resolvedAction.label}
            </span>
            <ArrowRight
              className="h-3.5 w-3.5 self-center text-atlas-muted"
              aria-hidden
            />
            <span className="break-all font-mono text-atlas-muted">
              {row.original.resolvedAction.url}
            </span>
          </div>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Estado",
      enableSorting: false,
      accessorKey: "isActive",
      cell: ({ row }) => (
        <Badge tone={row.original.isActive ? "success" : "muted"}>
          {row.original.isActive ? "visible" : "oculto"}
        </Badge>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true },
      cell: ({ row }) => (
        <PermissionGate permissions={APP_CONTENT_MANAGE} fallback={null}>
          <Button
            variant="secondary"
            className="h-8 px-2 text-xs"
            onClick={() => onEdit(row.original)}
            data-testid={`edit-${row.original.contentKey}`}
          >
            Editar
          </Button>
        </PermissionGate>
      ),
    },
  ];
}
