"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  DataEntityImpact,
  FieldImpact,
  ToolRequirement,
} from "@/features/systems/types";
import { ReviewStatusBadge, RiskBadge } from "@/shared/components/ui/badges";
import { formatBoolean } from "@/shared/lib/format";
import { ReviewActions } from "./review-actions";
import type { Decision, SetPendingReview } from "./review-column-types";

export function buildDataImpactColumns(
  setPending: SetPendingReview,
  canReview: boolean,
): ColumnDef<DataEntityImpact>[] {
  return [
    {
      header: "Impacto",
      accessorKey: "impactId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">#{row.original.impactId}</span>
      ),
    },
    {
      header: "Endpoint",
      accessorKey: "endpointId",
      cell: ({ row }) => (
        <EntityLink
          href={`/internal/systems/endpoints/${row.original.endpointId}`}
          label={`#${row.original.endpointId}`}
        />
      ),
    },
    {
      header: "Tabla",
      accessorKey: "dataEntityId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">#{row.original.dataEntityId}</span>
      ),
    },
    { header: "Operación", accessorKey: "operationType" },
    {
      header: "Nivel",
      accessorKey: "impactLevel",
      cell: ({ row }) => <RiskBadge value={row.original.impactLevel} />,
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
              targetType: "dataImpact",
              targetId: row.original.impactId,
              title: `Impacto #${row.original.impactId}`,
              decision,
            })
          }
        />
      ),
    },
  ];
}

export function buildFieldImpactColumns(
  setPending: SetPendingReview,
  canReview: boolean,
): ColumnDef<FieldImpact>[] {
  return [
    {
      header: "Campo",
      accessorKey: "fieldName",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.fieldName}</span>
      ),
    },
    {
      header: "Endpoint",
      accessorKey: "endpointId",
      cell: ({ row }) => (
        <EntityLink
          href={`/internal/systems/endpoints/${row.original.endpointId}`}
          label={`#${row.original.endpointId}`}
        />
      ),
    },
    {
      header: "Tabla",
      accessorKey: "dataEntityId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">#{row.original.dataEntityId}</span>
      ),
    },
    { header: "Operación", accessorKey: "fieldOperation" },
    {
      header: "Sensible",
      accessorKey: "isSensitive",
      cell: ({ row }) => formatBoolean(row.original.isSensitive),
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
              targetType: "fieldImpact",
              targetId: row.original.fieldImpactId,
              title: row.original.fieldName,
              decision,
            })
          }
        />
      ),
    },
  ];
}

export function buildToolColumns(
  setPending: SetPendingReview,
  canReview: boolean,
): ColumnDef<ToolRequirement>[] {
  return [
    {
      header: "Requirement",
      accessorKey: "requirementId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">#{row.original.requirementId}</span>
      ),
    },
    {
      header: "Endpoint",
      accessorKey: "endpointId",
      cell: ({ row }) => (
        <EntityLink
          href={`/internal/systems/endpoints/${row.original.endpointId}`}
          label={`#${row.original.endpointId}`}
        />
      ),
    },
    {
      header: "Tool",
      accessorKey: "toolId",
      cell: ({ row }) => (
        <EntityLink
          href={`/internal/systems/tools/${row.original.toolId}`}
          label={`#${row.original.toolId}`}
        />
      ),
    },
    { header: "Uso", accessorKey: "usageType" },
    {
      header: "Requerida",
      accessorKey: "isRequired",
      cell: ({ row }) => formatBoolean(row.original.isRequired),
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
              targetType: "toolRequirement",
              targetId: row.original.requirementId,
              title: `Tool requirement #${row.original.requirementId}`,
              decision,
            })
          }
        />
      ),
    },
  ];
}

function EntityLink({
  href,
  label,
}: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      className="font-mono text-xs text-blue-700 hover:underline"
      href={href}
    >
      {label}
    </Link>
  );
}
