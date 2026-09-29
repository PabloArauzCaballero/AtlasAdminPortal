"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Lock } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { CHANNEL_LABEL, categoryLabel } from "./policy-labels";
import type { NotificationPolicy } from "./types";

/**
 * Columnas de la tabla de políticas. La tabla pagina en el servidor, así que ninguna columna se
 * ofrece ordenable: reordenar sólo la página cargada prometería un orden global.
 */
export function buildPolicyColumns(
  onEdit: (policy: NotificationPolicy) => void,
): ColumnDef<NotificationPolicy>[] {
  return [
    {
      header: "Código",
      enableSorting: false,
      accessorKey: "eventCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-atlas-text">
          {row.original.eventCode}
        </span>
      ),
    },
    {
      header: "Nombre",
      enableSorting: false,
      accessorKey: "label",
      cell: ({ row }) => {
        const { label, description, mandatoryReason } = row.original;
        return (
          <div className="max-w-md space-y-1">
            <p className="text-sm font-semibold text-atlas-text">{label}</p>
            {description ? (
              <p className="text-xs leading-5 text-atlas-muted">
                {description}
              </p>
            ) : null}
            {mandatoryReason ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs leading-5 text-amber-800">
                <span className="font-medium">Motivo que ve el cliente:</span>{" "}
                {mandatoryReason}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Categoría",
      enableSorting: false,
      accessorKey: "category",
      cell: ({ row }) => (
        <span className="text-sm text-atlas-text">
          {categoryLabel(row.original.category)}
        </span>
      ),
    },
    {
      header: "Canal",
      enableSorting: false,
      accessorKey: "channel",
      cell: ({ row }) => (
        <span className="text-sm text-atlas-text">
          {CHANNEL_LABEL[row.original.channel] ?? row.original.channel}
        </span>
      ),
    },
    {
      header: "Obligatoria",
      enableSorting: false,
      accessorKey: "isMandatory",
      cell: ({ row }) =>
        row.original.isMandatory ? (
          <Badge tone="warning" icon={Lock}>
            irrenunciable
          </Badge>
        ) : (
          <span className="text-xs text-atlas-muted">apagable</span>
        ),
    },
    {
      header: "Activa",
      enableSorting: false,
      accessorKey: "isActive",
      cell: ({ row }) => (
        <Badge tone={row.original.isActive ? "success" : "muted"}>
          {row.original.isActive ? "activo" : "inactivo"}
        </Badge>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true },
      cell: ({ row }) => (
        // Declarar un aviso irrenunciable es gestión: el servidor sólo lo acepta de quien tiene
        // `governance.policies.manage`, y un botón que siempre acaba en 403 no ayuda.
        <PermissionGate
          permissions={["governance.policies.manage"]}
          fallback={null}
        >
          <Button
            variant="secondary"
            className="h-8 px-2 text-xs"
            onClick={() => onEdit(row.original)}
            data-testid={`edit-${row.original.eventCode}-${row.original.channel}`}
          >
            Editar
          </Button>
        </PermissionGate>
      ),
    },
  ];
}
