"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { DataQualityIssue } from "@/features/operations/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { SeverityBadge, StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";

const CLOSED = new Set(["resolved", "ignored", "closed"]);

/** Cerrada = corregida, descartada o cerrada. Una reconocida sigue pendiente. */
export function isClosedIssue(issue: DataQualityIssue): boolean {
  return CLOSED.has((issue.status ?? "open").toLowerCase());
}

export function isAcknowledgedIssue(issue: DataQualityIssue): boolean {
  return (issue.status ?? "").toLowerCase() === "acknowledged";
}

/**
 * Sin ordenar en el navegador: la bandeja está paginada en el servidor y una cabecera ordenable sólo
 * reordenaba las 20 filas visibles. El orden (más recientes primero) lo decide AtlasBackend.
 */
export function buildIssueColumns(
  onResolve: (issue: DataQualityIssue) => void,
): ColumnDef<DataQualityIssue>[] {
  const columns: ColumnDef<DataQualityIssue>[] = [
    {
      header: "Incidencia",
      accessorKey: "issueId",
      cell: ({ row }) => (
        <div>
          <span className="font-mono text-xs font-semibold">
            #{row.original.issueId}
          </span>
          <p className="text-xs text-atlas-muted">
            {safeText(row.original.ruleName ?? row.original.issueCode)}
          </p>
        </div>
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status ?? "open"} />,
    },
    {
      header: "Severidad",
      accessorKey: "severity",
      cell: ({ row }) => <SeverityBadge value={row.original.severity} />,
    },
    {
      header: "Tabla",
      accessorKey: "entityType",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.entityType)}
        </span>
      ),
    },
    {
      header: "Registro",
      accessorKey: "entityId",
      cell: ({ row }) => safeText(row.original.entityId),
    },
    {
      header: "Detectada",
      accessorKey: "detectedAt",
      cell: ({ row }) => formatDateTime(row.original.detectedAt),
    },
    {
      header: "Notas",
      accessorKey: "resolutionNotes",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-xs text-atlas-muted">
          {safeText(row.original.resolutionNotes)}
        </span>
      ),
    },
    {
      header: "Acciones",
      id: "actions",
      cell: ({ row }) =>
        isClosedIssue(row.original) ? (
          <span className="text-xs text-atlas-muted">
            Cerrada {formatDateTime(row.original.resolvedAt)}
          </span>
        ) : (
          // Resolver (incluido reconocer) exige `dataQuality.issues.resolve` en AtlasBackend: quien
          // sólo puede leer (el auditor) no ve el botón en vez de recibir un 403.
          <PermissionGate
            permissions={["dataQuality.issues.resolve"]}
            fallback={null}
          >
            <Button onClick={() => onResolve(row.original)}>
              {isAcknowledgedIssue(row.original) ? "Cerrar" : "Resolver"}
            </Button>
          </PermissionGate>
        ),
    },
  ];
  return columns.map((column) => ({ ...column, enableSorting: false }));
}
