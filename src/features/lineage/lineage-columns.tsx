"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { DataEntity, EndpointItem } from "@/features/systems/types";
import {
  BooleanBadge,
  ModuleBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";

export function buildEntityColumns(): ColumnDef<DataEntity>[] {
  return [
    {
      header: "Tabla",
      accessorKey: "tableName",
      cell: ({ row }) => (
        <Link
          className="font-mono text-xs font-semibold text-blue-700 hover:underline"
          href={`/internal/data-catalog/tables/${row.original.entityId}`}
        >
          {row.original.schemaName}.{row.original.tableName}
        </Link>
      ),
    },
    {
      header: "Dominio",
      accessorKey: "module",
      cell: ({ row }) => <ModuleBadge value={row.original.module} />,
    },
    {
      header: "PII",
      accessorKey: "containsPii",
      cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
    },
    {
      header: "Financiera",
      accessorKey: "containsFinancialData",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.containsFinancialData} />
      ),
    },
    {
      header: "Riesgo",
      accessorKey: "containsRiskData",
      cell: ({ row }) => <BooleanBadge value={row.original.containsRiskData} />,
    },
    {
      header: "Legal",
      accessorKey: "containsLegalData",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.containsLegalData} />
      ),
    },
    {
      header: "Impacto",
      id: "impact",
      cell: ({ row }) => (
        <Link
          className="text-xs font-medium text-blue-700 hover:underline"
          href={`/internal/lineage/table/${encodeURIComponent(row.original.schemaName)}/${encodeURIComponent(row.original.tableName)}`}
        >
          Ver impacto
        </Link>
      ),
    },
  ];
}

export function buildEndpointColumns(): ColumnDef<EndpointItem>[] {
  return [
    {
      header: "Endpoint",
      accessorKey: "fullPath",
      cell: ({ row }) => (
        <Link
          className="font-mono text-xs font-semibold text-blue-700 hover:underline"
          href={`/internal/systems/endpoints/${row.original.endpointId}`}
        >
          {row.original.method} {row.original.fullPath}
        </Link>
      ),
    },
    {
      header: "Dominio",
      accessorKey: "module",
      cell: ({ row }) => <ModuleBadge value={row.original.module} />,
    },
    {
      header: "Riesgo",
      accessorKey: "riskLevel",
      cell: ({ row }) => <RiskBadge value={row.original.riskLevel} />,
    },
    {
      header: "PII",
      accessorKey: "containsPii",
      cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
    },
    {
      header: "Stress",
      accessorKey: "requiresStressTest",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.requiresStressTest} />
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
  ];
}
