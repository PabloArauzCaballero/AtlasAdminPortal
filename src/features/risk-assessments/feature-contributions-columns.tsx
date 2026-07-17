"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatNumber, safeText } from "@/shared/lib/format";
import type { RiskFeatureContribution } from "./types";

export function buildFeatureContributionColumns(): ColumnDef<RiskFeatureContribution>[] {
  return [
    {
      header: "Feature",
      accessorKey: "featureCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.featureCode)}
        </span>
      ),
    },
    {
      header: "Bin / atributo",
      accessorKey: "binOrAttribute",
      cell: ({ row }) => safeText(row.original.binOrAttribute),
    },
    {
      header: "Puntos",
      accessorKey: "scorePoints",
      cell: ({ row }) => formatNumber(row.original.scorePoints),
    },
    {
      header: "WoE",
      accessorKey: "woeValue",
      cell: ({ row }) => formatNumber(row.original.woeValue),
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
      header: "Valor crudo",
      accessorKey: "rawValueJson",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-xs font-mono text-xs">
          {safeText(row.original.rawValueJson)}
        </span>
      ),
    },
  ];
}
