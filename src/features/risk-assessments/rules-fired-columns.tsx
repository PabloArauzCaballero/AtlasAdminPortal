"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge, SeverityBadge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { RiskRuleFired } from "./types";

export function buildRulesFiredColumns(): ColumnDef<RiskRuleFired>[] {
  return [
    {
      header: "Regla",
      accessorKey: "ruleCodeSnapshot",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.ruleCodeSnapshot)}
        </span>
      ),
    },
    {
      header: "Reason code",
      accessorKey: "reasonCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.reasonCode)}
        </span>
      ),
    },
    {
      header: "Dimensión",
      accessorKey: "riskDimension",
      cell: ({ row }) => safeText(row.original.riskDimension),
    },
    {
      header: "Severidad",
      accessorKey: "severity",
      cell: ({ row }) => <SeverityBadge value={row.original.severity} />,
    },
    {
      header: "Acción",
      accessorKey: "outputAction",
      cell: ({ row }) => safeText(row.original.outputAction),
    },
    {
      header: "Bloqueante",
      accessorKey: "isHardStop",
      cell: ({ row }) => (
        <Badge tone={row.original.isHardStop ? "critical" : "muted"}>
          {row.original.isHardStop ? "Sí" : "No"}
        </Badge>
      ),
    },
    {
      header: "Disparada",
      accessorKey: "firedAt",
      cell: ({ row }) => formatDateTime(row.original.firedAt),
    },
  ];
}
