"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge, BooleanBadge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { SessionAuthEvent, SessionPermissionEvent } from "./types";

export function buildAuthEventColumns(): ColumnDef<SessionAuthEvent>[] {
  return [
    {
      header: "Ocurrió",
      accessorKey: "occurredAt",
      cell: ({ row }) => formatDateTime(row.original.occurredAt),
    },
    {
      header: "Tipo de evento",
      accessorKey: "eventType",
      cell: ({ row }) => safeText(row.original.eventType),
    },
    {
      header: "Resultado",
      accessorKey: "loginSuccessful",
      cell: ({ row }) => {
        // `null` = el evento no registró resultado (p. ej. un logout), no es un fallo.
        if (row.original.loginSuccessful === null) {
          return <Badge tone="muted">—</Badge>;
        }
        return (
          <Badge tone={row.original.loginSuccessful ? "success" : "critical"}>
            {row.original.loginSuccessful ? "Exitoso" : "Fallido"}
          </Badge>
        );
      },
    },
  ];
}

export function buildPermissionColumns(): ColumnDef<SessionPermissionEvent>[] {
  return [
    {
      header: "Permiso",
      accessorKey: "permissionCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.permissionCode)}
        </span>
      ),
    },
    {
      header: "Otorgado",
      accessorKey: "granted",
      cell: ({ row }) => (
        <BooleanBadge
          value={row.original.granted}
          trueLabel="Otorgado"
          falseLabel="Denegado"
          tone="success"
        />
      ),
    },
    {
      header: "Respondido",
      accessorKey: "respondedAt",
      cell: ({ row }) => formatDateTime(row.original.respondedAt),
    },
  ];
}
