"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge, RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { safeText } from "@/shared/lib/format";
import type { LineageEdge, LineageImpactItem, LineageNode } from "./types";

export function buildLineageNodeColumns(): ColumnDef<LineageNode>[] {
  return [
    {
      header: "Nodo",
      accessorKey: "label",
      cell: ({ row }) => (
        <Link
          className="font-semibold text-blue-700 underline"
          href={`/internal/lineage/nodes/${row.original.nodeId}`}
        >
          {row.original.label}
        </Link>
      ),
    },
    {
      header: "Tipo",
      accessorKey: "nodeType",
      cell: ({ row }) => <Badge tone="info">{row.original.nodeType}</Badge>,
    },
    {
      header: "Dominio",
      accessorKey: "domain",
      cell: ({ row }) =>
        row.original.domain ? (
          <Badge tone="muted">{row.original.domain}</Badge>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
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

export function buildLineageEdgeColumns(
  nodesById?: Map<string, LineageNode>,
): ColumnDef<LineageEdge>[] {
  const label = (id: string) => nodesById?.get(id)?.label ?? `#${id}`;
  return [
    {
      header: "Tipo",
      accessorKey: "edgeType",
      cell: ({ row }) => <Badge tone="info">{row.original.edgeType}</Badge>,
    },
    {
      header: "Origen",
      accessorKey: "sourceNodeId",
      cell: ({ row }) => (
        <Link
          className="font-medium text-blue-700 underline"
          href={`/internal/lineage/nodes/${row.original.sourceNodeId}`}
        >
          {label(row.original.sourceNodeId)}
        </Link>
      ),
    },
    {
      header: "Destino",
      accessorKey: "targetNodeId",
      cell: ({ row }) => (
        <Link
          className="font-medium text-blue-700 underline"
          href={`/internal/lineage/nodes/${row.original.targetNodeId}`}
        >
          {label(row.original.targetNodeId)}
        </Link>
      ),
    },
    {
      header: "Etiqueta",
      accessorKey: "label",
      cell: ({ row }) => safeText(row.original.label ?? "—"),
    },
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
