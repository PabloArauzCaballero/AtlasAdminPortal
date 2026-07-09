"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { DataQualityIssue } from "@/features/operations/types";
import { Button } from "@/shared/components/ui/button";
import { SeverityBadge, StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { ResolutionState } from "./types";

export function buildIssueColumns(
  setResolution: (value: ResolutionState) => void,
): ColumnDef<DataQualityIssue>[] {
  return [
    {
      header: "Issue",
      accessorKey: "issueId",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          #{row.original.issueId}
        </span>
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      header: "Severidad",
      accessorKey: "severity",
      cell: ({ row }) => <SeverityBadge value={row.original.severity} />,
    },
    {
      header: "Entidad",
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
      header: "Detectado",
      accessorKey: "detectedAt",
      cell: ({ row }) => formatDateTime(row.original.detectedAt),
    },
    {
      header: "Resuelto",
      accessorKey: "resolvedAt",
      cell: ({ row }) => formatDateTime(row.original.resolvedAt),
    },
    {
      header: "Acciones",
      id: "actions",
      cell: ({ row }) =>
        row.original.resolvedAt ? (
          <span className="text-xs text-atlas-muted">Cerrado</span>
        ) : (
          <Button
            onClick={() =>
              setResolution({
                issue: row.original,
                resolution: "resolved",
                reasonCode: "manual_review",
                notes: "",
              })
            }
          >
            Resolver
          </Button>
        ),
    },
  ];
}
