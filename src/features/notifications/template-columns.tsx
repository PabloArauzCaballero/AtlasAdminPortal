"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { safeText } from "@/shared/lib/format";
import { NotificationChannelBadge } from "./notification-columns";
import type { NotificationTemplate } from "./types";

/**
 * Columnas de la tabla de plantillas. La tabla pagina en el servidor, así que ninguna columna se
 * ofrece ordenable: reordenar sólo la página cargada prometería un orden global que no existe.
 */
export function buildTemplateColumns(
  onEdit: (template: NotificationTemplate) => void,
): ColumnDef<NotificationTemplate>[] {
  return [
    {
      header: "Código",
      enableSorting: false,
      accessorKey: "code",
      cell: ({ row }) => (
        <code className="font-mono text-xs font-semibold text-atlas-text">
          {row.original.code}
        </code>
      ),
    },
    {
      header: "Canal",
      enableSorting: false,
      accessorKey: "channel",
      cell: ({ row }) => (
        <NotificationChannelBadge value={row.original.channel} />
      ),
    },
    {
      header: "Idioma",
      enableSorting: false,
      accessorKey: "locale",
      cell: ({ row }) => <Badge tone="muted">{row.original.locale}</Badge>,
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
      header: "Categoría",
      enableSorting: false,
      accessorKey: "category",
      cell: ({ row }) =>
        row.original.category ? (
          <Badge tone="muted">{row.original.category}</Badge>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Título y texto",
      enableSorting: false,
      accessorKey: "titleTemplate",
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="text-xs text-atlas-muted">
            {safeText(row.original.titleTemplate)}
          </p>
          <p className="line-clamp-2 text-xs text-atlas-text">
            {row.original.bodyTemplate}
          </p>
        </div>
      ),
    },
    {
      header: "Estado",
      enableSorting: false,
      accessorKey: "isActive",
      cell: ({ row }) => (
        <Badge tone={row.original.isActive ? "success" : "muted"}>
          {row.original.isActive ? "activa" : "inactiva"}
        </Badge>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true },
      cell: ({ row }) => (
        <PermissionGate
          permissions={["notifications.templates.manage"]}
          fallback={<span className="text-atlas-muted">—</span>}
        >
          <Button
            variant="secondary"
            className="h-8 px-2 text-xs"
            onClick={() => onEdit(row.original)}
          >
            Editar
          </Button>
        </PermissionGate>
      ),
    },
  ];
}
