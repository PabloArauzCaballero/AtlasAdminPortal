"use client";

import type { ColumnDef } from "@tanstack/react-table";

import Link from "next/link";

import {
  Badge,
  BlockBadge,
  MethodBadge,
  RiskBadge,
} from "@/shared/components/ui/badges";

import { CLIENT_OPTIONS, labelFrom } from "./filter-options";
import { type Flow } from "./types";

/**
 * Las columnas de la tabla de flujos.
 *
 * Salen de `flows-page.tsx` porque la pantalla pasaba de las 300 líneas que admite `yarn max-lines`
 * y noventa de ellas eran esta tabla. Es la misma convención que ya siguen `portfolio-columns` y
 * `partner-queue-columns`: la pantalla ORQUESTA —qué se pide, qué se filtra— y las columnas dicen
 * cómo se pinta cada celda.
 */
export function buildFlowColumns(
  openFlow: (flowId: string) => void,
): ColumnDef<Flow>[] {
  return [
    {
      header: "Ruta",
      accessorKey: "path",
      cell: ({ row }) => (
        <button
          type="button"
          className="inline-flex items-center gap-2 text-left font-mono text-xs text-atlas-accent underline"
          onClick={() => openFlow(row.original.id)}
        >
          <MethodBadge method={row.original.httpMethod} />
          {row.original.path}
        </button>
      ),
    },
    {
      header: "Sistema",
      accessorKey: "systemCode",
      cell: ({ row }) => <BlockBadge value={row.original.systemCode} />,
    },
    {
      header: "Módulo",
      accessorKey: "module",
      cell: ({ row }) => (
        <Link
          className="text-atlas-accent underline"
          title="Ver el diagrama del módulo"
          href={`/internal/flows/graph?systemCode=${row.original.systemCode}&module=${row.original.module}`}
        >
          {row.original.module}
        </Link>
      ),
    },
    {
      header: "Riesgo",
      accessorKey: "risk",
      cell: ({ row }) => <RiskBadge value={row.original.risk} />,
    },
    {
      header: "Autorización",
      accessorKey: "isPublic",
      cell: ({ row }) => {
        const flow = row.original;
        if (flow.isPublic) return <Badge tone="warning">Pública</Badge>;
        if (flow.internalPermissions.length)
          return <Badge tone="info">Permiso interno</Badge>;
        if (flow.roles.length)
          return <Badge tone="default">{flow.roles.length} roles</Badge>;
        return <Badge tone="muted">Sólo sesión</Badge>;
      },
    },
    {
      header: "Quién la llama",
      accessorKey: "callers",
      cell: ({ row }) =>
        row.original.callers.length ? (
          row.original.callers
            .map((caller) => labelFrom(CLIENT_OPTIONS, caller))
            .join(", ")
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Señales",
      accessorKey: "findingsCount",
      cell: ({ row }) => {
        const flow = row.original;
        return (
          <span className="inline-flex flex-wrap items-center gap-1 text-xs">
            <span>
              {flow.testStatus === "TESTED" ? "Con pruebas" : "Sin pruebas"}
            </span>
            <span className="text-atlas-muted">·</span>
            <span>
              {flow.contractStatus === "IN_CONTRACT"
                ? "Documentada"
                : flow.contractStatus === "CODE_ONLY"
                  ? "Sin contrato"
                  : "Contrato sin revisar"}
            </span>
            {flow.findingsCount ? (
              <Badge tone="warning">
                {flow.findingsCount} hallazgo
                {flow.findingsCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </span>
        );
      },
    },
  ];
}
