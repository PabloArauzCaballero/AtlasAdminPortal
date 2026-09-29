"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import type { DataQualityRule } from "./types";

/**
 * Sin ordenar en el navegador: la tabla está paginada en el servidor y una cabecera ordenable sólo
 * reordenaba las 20 filas visibles. El orden (de más a menos grave) lo decide AtlasBackend.
 */
export function buildRuleColumns(): ColumnDef<DataQualityRule>[] {
  return columns.map((column) => ({ ...column, enableSorting: false }));
}

const columns: ColumnDef<DataQualityRule>[] = [
  {
    header: "Regla",
    accessorKey: "ruleName",
    cell: ({ row }) => (
      <Link
        className="font-medium text-atlas-accent underline"
        href={`/internal/data-quality/rules/${row.original.ruleId}`}
      >
        {row.original.ruleName}
      </Link>
    ),
  },
  {
    header: "Código",
    accessorKey: "ruleCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.ruleCode}</span>
    ),
  },
  {
    header: "Objetivo",
    accessorKey: "targetTable",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.targetTable}
        {row.original.targetField ? `.${row.original.targetField}` : ""}
      </span>
    ),
  },
  { header: "Tipo", accessorKey: "ruleType" },
  {
    header: "Severidad",
    accessorKey: "severity",
    cell: ({ row }) => <RiskBadge value={row.original.severity} />,
  },
  {
    header: "Estado",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  {
    // Las reglas no se ejecutan (no hay evaluador): esta fecha es cuándo cambió la definición.
    header: "Definición actualizada",
    accessorKey: "definitionUpdatedAt",
    cell: ({ row }) => formatDateTime(row.original.definitionUpdatedAt),
  },
  {
    header: "Pendientes",
    accessorKey: "openIssues",
    cell: ({ row }) => formatNumber(row.original.openIssues),
  },
];
