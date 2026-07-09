"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { safeText } from "@/shared/lib/format";
import type { LineageEdge, LineageImpactItem, LineageNode } from "./types";

export function buildLineageNodeColumns(): ColumnDef<LineageNode>[] {
  return [
    {
      header: "Nodo",
      accessorKey: "label",
      cell: ({ row }) => (
        <Link
          className="font-semibold text-blue-700 hover:underline"
          href={`/internal/lineage/nodes/${row.original.nodeId}`}
        >
          {row.original.label}
        </Link>
      ),
    },
    { header: "Tipo", accessorKey: "nodeType" },
    { header: "Dominio", accessorKey: "domain" },
    {
      header: "Criticidad",
      accessorKey: "criticality",
      cell: ({ row }) => <RiskBadge value={row.original.criticality} />,
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
  ];
}

export function buildLineageEdgeColumns(): ColumnDef<LineageEdge>[] {
  return [
    { header: "Tipo", accessorKey: "edgeType" },
    { header: "Origen", accessorKey: "sourceNodeId" },
    { header: "Destino", accessorKey: "targetNodeId" },
    { header: "Etiqueta", accessorKey: "label" },
  ];
}

export function buildImpactColumns(): ColumnDef<LineageImpactItem>[] {
  return [
    { header: "Tipo", accessorKey: "impactType" },
    {
      header: "Severidad",
      accessorKey: "severity",
      cell: ({ row }) => <RiskBadge value={row.original.severity} />,
    },
    { header: "Origen", accessorKey: "sourceNodeId" },
    { header: "Destino", accessorKey: "targetNodeId" },
    {
      header: "Descripción",
      accessorKey: "description",
      cell: ({ row }) => safeText(row.original.description),
    },
  ];
}
