"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { DataEntity, EndpointItem } from "@/features/systems/types";
import {
  MethodBadge,
  ModuleBadge,
  PiiBadge,
  ReviewStatusBadge,
  RiskBadge,
} from "@/shared/components/ui/badges";
import { ReviewActions } from "./review-actions";
import type { Decision, SetPendingReview } from "./review-column-types";

export function buildEndpointColumns(
  setPending: SetPendingReview,
  canReview: boolean,
): ColumnDef<EndpointItem>[] {
  return [
    {
      header: "Método",
      accessorKey: "method",
      cell: ({ row }) => <MethodBadge method={row.original.method} />,
    },
    {
      header: "Ruta",
      accessorKey: "fullPath",
      cell: ({ row }) => (
        <Link
          className="font-mono text-xs text-blue-700 hover:underline"
          href={`/internal/systems/endpoints/${row.original.endpointId}`}
        >
          {row.original.fullPath}
        </Link>
      ),
    },
    {
      header: "Módulo",
      accessorKey: "module",
      cell: ({ row }) => <ModuleBadge value={row.original.module} />,
    },
    {
      header: "Riesgo",
      accessorKey: "riskLevel",
      cell: ({ row }) => <RiskBadge value={row.original.riskLevel} />,
    },
    {
      header: "Review",
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <ReviewStatusBadge value={row.original.reviewStatus} />
      ),
    },
    {
      header: "Acciones",
      id: "actions",
      cell: ({ row }) => (
        <ReviewActions
          canReview={canReview}
          onDecision={(decision: Decision) =>
            setPending({
              targetType: "endpoint",
              targetId: row.original.endpointId,
              title: row.original.fullPath,
              decision,
            })
          }
        />
      ),
    },
  ];
}

export function buildEntityColumns(
  setPending: SetPendingReview,
  canReview: boolean,
): ColumnDef<DataEntity>[] {
  return [
    {
      header: "Tabla",
      accessorKey: "tableName",
      cell: ({ row }) => (
        <Link
          className="font-mono text-xs text-blue-700 hover:underline"
          href={`/internal/data-catalog/tables/${row.original.entityId}`}
        >
          {row.original.schemaName}.{row.original.tableName}
        </Link>
      ),
    },
    {
      header: "Módulo",
      accessorKey: "module",
      cell: ({ row }) => <ModuleBadge value={row.original.module} />,
    },
    { header: "Owner", accessorKey: "dataOwner" },
    {
      header: "PII",
      accessorKey: "containsPii",
      cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
    },
    {
      header: "Review",
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <ReviewStatusBadge value={row.original.reviewStatus} />
      ),
    },
    {
      header: "Acciones",
      id: "actions",
      cell: ({ row }) => (
        <ReviewActions
          canReview={canReview}
          onDecision={(decision: Decision) =>
            setPending({
              targetType: "dataEntity",
              targetId: row.original.entityId,
              title: `${row.original.schemaName}.${row.original.tableName}`,
              decision,
            })
          }
        />
      ),
    },
  ];
}
