"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import { typeLabel } from "./labels";
import { DuePill, PrivacyStatusBadge } from "./privacy-request-badges";
import type { PrivacyRequest } from "./types";

export const privacyRequestHref = (requestId: string) =>
  `/internal/governance/privacy-requests/${encodeURIComponent(requestId)}`;

/*
 * Anchos en `ch` por lo mismo que en la cola de usuarios de comercio: la tabla se dimensiona por su
 * contenido (`min-w-max`) y la columna clavada a la derecha se pintaba encima de la anterior cuando
 * un nombre largo empujaba la fila.
 */
export function buildPrivacyRequestColumns(): ColumnDef<PrivacyRequest>[] {
  return [
    {
      accessorKey: "requestCode",
      header: "Solicitud",
      cell: ({ row }) => (
        <div className="w-[22ch]">
          <p
            className={cn(
              "truncate font-medium",
              row.original.overdue ? "text-red-700" : "text-atlas-text",
            )}
          >
            {typeLabel(row.original.requestType)}
          </p>
          <p className="truncate font-mono text-xs text-atlas-muted">
            {safeText(row.original.requestCode)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Cliente",
      cell: ({ row }) => (
        <div className="w-[24ch]">
          <p className="truncate text-atlas-text">
            {row.original.customerName ?? "Sin nombre registrado"}
          </p>
          <p className="truncate font-mono text-xs text-atlas-muted">
            {safeText(row.original.customerCode ?? row.original.customerId)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "receivedAt",
      header: "Recibida",
      cell: ({ row }) => formatDateTime(row.original.receivedAt),
    },
    {
      accessorKey: "dueAt",
      header: "Plazo",
      cell: ({ row }) => (
        <div className="w-[20ch] space-y-0.5">
          <DuePill request={row.original} />
          <p className="text-xs text-atlas-muted">
            {formatDateTime(row.original.dueAt)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "handledByName",
      header: "Responsable",
      cell: ({ row }) => (
        <span className="block w-[20ch] truncate">
          {row.original.handledByName ?? "Sin asignar"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Estado",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <PrivacyStatusBadge status={row.original.status} />
          <Link
            href={privacyRequestHref(row.original.requestId)}
            className="text-xs font-medium text-atlas-accent hover:underline"
          >
            Abrir
          </Link>
        </div>
      ),
    },
  ];
}
