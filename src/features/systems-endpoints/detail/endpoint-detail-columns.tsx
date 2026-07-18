"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  DataEntityImpact,
  FieldImpact,
  ToolRequirement,
} from "@/features/systems/types";
import { ReviewStatusBadge, RiskBadge } from "@/shared/components/ui/badges";
import { formatBoolean, safeText } from "@/shared/lib/format";

export function buildDataImpactColumns(): ColumnDef<DataEntityImpact>[] {
  return [
    {
      header: "Tabla",
      accessorKey: "dataEntityId",
      cell: ({ row }) => <TableLink impact={row.original} />,
    },
    { header: "Operación", accessorKey: "operationType" },
    {
      header: "Impacto",
      accessorKey: "impactLevel",
      cell: ({ row }) => <RiskBadge value={row.original.impactLevel} />,
    },
    {
      header: "Principal",
      accessorKey: "isPrimaryEntity",
      cell: ({ row }) => formatBoolean(row.original.isPrimaryEntity),
    },
    {
      header: "Auditoría",
      accessorKey: "requiresAuditLog",
      cell: ({ row }) => formatBoolean(row.original.requiresAuditLog),
    },
    {
      header: "Review",
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <ReviewStatusBadge value={row.original.reviewStatus} />
      ),
    },
  ];
}

export function buildFieldColumns(): ColumnDef<FieldImpact>[] {
  return [
    {
      header: "Campo",
      accessorKey: "fieldName",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.fieldName)}
        </span>
      ),
    },
    { header: "Tabla", cell: ({ row }) => tableLabel(row.original.dataEntity) },
    { header: "Operación", accessorKey: "fieldOperation" },
    {
      header: "Requerido",
      accessorKey: "isRequiredInput",
      cell: ({ row }) => formatBoolean(row.original.isRequiredInput),
    },
    {
      header: "Sensible",
      accessorKey: "isSensitive",
      cell: ({ row }) => formatBoolean(row.original.isSensitive),
    },
    {
      header: "Validación",
      accessorKey: "validationRule",
      cell: ({ row }) => safeText(row.original.validationRule ?? "—"),
    },
    {
      header: "Review",
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <ReviewStatusBadge value={row.original.reviewStatus} />
      ),
    },
  ];
}

export function buildToolColumns(): ColumnDef<ToolRequirement>[] {
  return [
    {
      header: "Herramienta",
      accessorKey: "toolId",
      cell: ({ row }) => <ToolLink requirement={row.original} />,
    },
    { header: "Uso", accessorKey: "usageType" },
    {
      header: "Requerida",
      accessorKey: "isRequired",
      cell: ({ row }) => formatBoolean(row.original.isRequired),
    },
    {
      header: "Mock",
      accessorKey: "requiresMock",
      cell: ({ row }) => formatBoolean(row.original.requiresMock),
    },
    {
      header: "Stress",
      accessorKey: "requiresStressTest",
      cell: ({ row }) => formatBoolean(row.original.requiresStressTest),
    },
    {
      header: "Review",
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <ReviewStatusBadge value={row.original.reviewStatus} />
      ),
    },
  ];
}

function TableLink({ impact }: Readonly<{ impact: DataEntityImpact }>) {
  const table = tableLabel(impact.dataEntity);
  return (
    <Link
      className="font-mono text-xs text-blue-700 underline"
      href={`/internal/data-catalog/tables/${impact.dataEntityId}`}
    >
      {table === "—" ? `#${impact.dataEntityId}` : table}
    </Link>
  );
}

function ToolLink({ requirement }: Readonly<{ requirement: ToolRequirement }>) {
  const label =
    requirement.tool?.code ??
    requirement.tool?.name ??
    `#${requirement.toolId}`;
  return (
    <Link
      className="font-mono text-xs text-blue-700 underline"
      href={`/internal/systems/tools/${requirement.toolId}`}
    >
      {safeText(label)}
    </Link>
  );
}

function tableLabel(
  table?: {
    schemaName?: string;
    tableName?: string;
    entityName?: string | null;
  } | null,
) {
  if (!table) return "—";
  if (table.schemaName && table.tableName)
    return `${table.schemaName}.${table.tableName}`;
  return table.tableName ?? table.entityName ?? "—";
}
