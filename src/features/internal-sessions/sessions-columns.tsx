"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { LogOut } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import { describeUserAgent } from "./user-agent";
import type { InternalSessionItem } from "./types";

/**
 * Las columnas de «Sesiones activas». Ninguna ordenable, por lo mismo que en «Usuarios internos»: la
 * lista viene paginada y ordenada por el servidor (renovación más reciente primero).
 */
export function buildSessionColumns(options: {
  canRevoke: boolean;
  currentUserId: string | null;
  onRevoke: (session: InternalSessionItem) => void;
}): ColumnDef<InternalSessionItem>[] {
  const columns: ColumnDef<InternalSessionItem>[] = [
    {
      header: "Persona",
      accessorKey: "email",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            className="text-atlas-accent underline"
            href={`/internal/settings/users/${row.original.internalUserId}`}
          >
            {row.original.fullName || row.original.email || "Sin nombre"}
          </Link>
          {row.original.fullName && row.original.email ? (
            <p className="truncate text-xs text-atlas-muted">
              {row.original.email}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      header: "Actividad",
      accessorKey: "activeNow",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.activeNow ? (
          <Badge tone="success" dot>
            Activa ahora
          </Badge>
        ) : (
          <Badge tone="muted">Sin actividad reciente</Badge>
        ),
    },
    {
      header: "Última renovación",
      accessorKey: "renewedAt",
      enableSorting: false,
      cell: ({ row }) => formatDateTime(row.original.renewedAt),
    },
    {
      header: "Vence",
      accessorKey: "expiresAt",
      enableSorting: false,
      cell: ({ row }) => formatDateTime(row.original.expiresAt),
    },
    {
      header: "IP",
      accessorKey: "ipAddress",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.ipAddress || "—"}
        </span>
      ),
    },
    {
      header: "Dispositivo",
      accessorKey: "userAgent",
      enableSorting: false,
      cell: ({ row }) => (
        <span title={row.original.userAgent ?? undefined}>
          {describeUserAgent(row.original.userAgent)}
        </span>
      ),
    },
  ];
  if (!options.canRevoke) return columns;
  return [
    ...columns,
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.internalUserId === options.currentUserId ? (
          <span className="text-xs text-atlas-muted">Tu sesión</span>
        ) : (
          <Button
            variant="danger"
            onClick={() => options.onRevoke(row.original)}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesiones
          </Button>
        ),
    },
  ];
}
