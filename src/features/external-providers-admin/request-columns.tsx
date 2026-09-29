"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Copy } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import type { ProviderRequestRow } from "./dashboard-types";
import { explainStatus } from "./finding-codes";
import { etiquetaTipoConsulta } from "./provider-display";

/** Aprobación: `approved` la dio un administrador después; `approved_inline`, quien la lanzó. */
const APROBACION: Record<string, string> = {
  approved: "Aprobada por un administrador",
  approved_inline: "Aprobada al lanzarla",
};

/*
 * Ninguna columna se ofrece ordenable: la tabla pagina en el servidor y ordenar sólo reordenaría
 * la página cargada. El orden es el del servidor: la más reciente primero.
 */
export function buildRequestColumns(): ColumnDef<ProviderRequestRow>[] {
  return [
    {
      id: "requestId",
      header: "ID",
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard?.writeText(row.original.requestId)
          }
          className="inline-flex items-center gap-1.5 font-mono text-xs text-atlas-text hover:text-atlas-accent"
          title="Copiar el identificador"
        >
          {row.original.requestId}
          <Copy className="h-3 w-3" aria-hidden />
        </button>
      ),
    },
    {
      id: "requestedAt",
      header: "Cuándo",
      enableSorting: false,
      cell: ({ row }) => formatDateTime(row.original.requestedAt),
    },
    {
      id: "providerCode",
      header: "Proveedor",
      enableSorting: false,
      cell: ({ row }) => row.original.providerCode ?? "—",
    },
    {
      id: "requestType",
      header: "Qué se pidió",
      enableSorting: false,
      cell: ({ row }) => etiquetaTipoConsulta(row.original.requestType),
    },
    {
      id: "customerId",
      header: "Cliente",
      enableSorting: false,
      cell: ({ row }) => row.original.customerId ?? "—",
    },
    {
      id: "responseStatus",
      header: "Cómo acabó",
      enableSorting: false,
      cell: ({ row }) => {
        const explicacion = row.original.responseStatus
          ? explainStatus(row.original.responseStatus)
          : null;
        return (
          <div>
            <Badge tone={explicacion?.tone ?? "default"}>
              {explicacion?.label ?? row.original.responseStatus ?? "—"}
            </Badge>
            {row.original.errorMessageSafe ? (
              <p className="mt-1 text-xs text-atlas-muted">
                {row.original.errorMessageSafe}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "approvalStatus",
      header: "Aprobación",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.approvalStatus
          ? (APROBACION[row.original.approvalStatus] ??
            row.original.approvalStatus)
          : "—",
    },
    {
      id: "latencyMs",
      header: "Tardó",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.latencyMs === null
          ? "—"
          : `${formatNumber(row.original.latencyMs)} ms`,
    },
  ];
}
