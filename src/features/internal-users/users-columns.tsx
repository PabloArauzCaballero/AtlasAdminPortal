"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatBoolean } from "@/shared/lib/format";
import { departmentLabel } from "./labels";
import type { InternalUserListItem } from "./types";

/**
 * Las columnas de «Usuarios internos».
 *
 * Ninguna se ofrece ordenable: la lista viene paginada del servidor y la tabla ordena en el
 * navegador, así que una cabecera ordenable sólo reordenaría los 25 de la página y se leería como
 * un orden de todo el equipo. El servidor ya las devuelve por orden de alta.
 */
export function buildInternalUserColumns(): ColumnDef<InternalUserListItem>[] {
  return [
    {
      header: "Usuario",
      accessorKey: "email",
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          className="text-atlas-accent underline"
          href={`/internal/settings/users/${row.original.id}`}
        >
          {row.original.email}
        </Link>
      ),
    },
    { header: "Nombre", accessorKey: "fullName", enableSorting: false },
    {
      header: "Departamento",
      accessorKey: "department",
      enableSorting: false,
      cell: ({ row }) => departmentLabel(row.original.department),
    },
    { header: "Cargo", accessorKey: "jobTitle", enableSorting: false },
    {
      header: "Roles",
      accessorKey: "roles",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.roles.join(", ") || "—"}</span>
      ),
    },
    {
      header: "Segundo factor",
      accessorKey: "mfaEnabled",
      enableSorting: false,
      cell: ({ row }) => formatBoolean(row.original.mfaEnabled),
    },
    {
      header: "Debe cambiar contraseña",
      accessorKey: "mustChangePassword",
      enableSorting: false,
      cell: ({ row }) => formatBoolean(row.original.mustChangePassword),
    },
    {
      header: "Estado",
      accessorKey: "status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
  ];
}
