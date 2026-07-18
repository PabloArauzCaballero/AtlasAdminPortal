"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import type { DataQualityRule } from "./types";

export function buildRuleColumns(): ColumnDef<DataQualityRule>[] {
  return [
    {
      header: "Regla",
      accessorKey: "ruleName",
      cell: ({ row }) => (
        <Link
          className="font-medium text-blue-700 underline"
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
      header: "Última ejecución",
      accessorKey: "lastRunAt",
      cell: ({ row }) => formatDateTime(row.original.lastRunAt),
    },
    {
      header: "Issues",
      accessorKey: "openIssues",
      cell: ({ row }) => formatNumber(row.original.openIssues),
    },
    {
      header: "Dueño",
      accessorKey: "owner",
      cell: ({ row }) => safeText(row.original.owner),
    },
  ];
}
