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
          className="font-semibold text-atlas-accent underline"
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
          className="font-medium text-atlas-accent underline"
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
          className="font-medium text-atlas-accent underline"
          href={`/internal/lineage/nodes/${row.original.targetNodeId}`}
        >
          {label(row.original.targetNodeId)}
        </Link>
      ),
    },
    {
      // Para endpoint → tabla es la severidad; para tabla → tabla, el motivo de la relación.
      header: "Detalle",
      accessorKey: "label",
      cell: ({ row }) => safeText(row.original.label ?? "—"),
    },
  ];
}

/** Enlace a la ficha de un extremo: un endpoint a su ficha de ruta, una tabla a su nodo de linaje. */
function NodeLink({
  node,
  fallback,
}: Readonly<{ node?: LineageNode; fallback: string }>) {
  if (!node) return <span className="font-mono text-xs">{fallback}</span>;
  const href =
    node.nodeType === "endpoint"
      ? `/internal/systems/endpoints/${node.referenceId}`
      : `/internal/lineage/nodes/${encodeURIComponent(node.nodeId)}`;
  return (
    <Link
      className="text-xs font-medium text-atlas-accent underline"
      href={href}
    >
      {node.label}
    </Link>
  );
}

export const FAMILY_LABELS: Record<string, string> = {
  impact: "Endpoint → tabla",
  relationship: "Tabla → tabla",
};

export function buildImpactColumns(): ColumnDef<LineageImpactItem>[] {
  return [
    {
      header: "Relación",
      id: "family",
      cell: ({ row }) => (
        <Badge tone="muted">
          {FAMILY_LABELS[row.original.family ?? ""] ?? "—"}
        </Badge>
      ),
    },
    { header: "Operación", accessorKey: "impactType" },
    {
      header: "Severidad",
      accessorKey: "severity",
      // Sólo las aristas endpoint → tabla tienen severidad. Antes una relación entre tablas enseñaba
      // aquí su motivo de negocio (texto libre) pintado como si fuera un nivel de riesgo.
      cell: ({ row }) =>
        row.original.severity ? (
          <RiskBadge value={row.original.severity} />
        ) : (
          <span className="text-xs text-atlas-muted">No aplica</span>
        ),
    },
    {
      header: "Origen",
      id: "source",
      cell: ({ row }) => (
        <NodeLink
          node={row.original.path?.[0]}
          fallback={row.original.sourceNodeId}
        />
      ),
    },
    {
      header: "Destino",
      id: "target",
      cell: ({ row }) => (
        <NodeLink
          node={row.original.path?.[1]}
          fallback={row.original.targetNodeId}
        />
      ),
    },
    {
      header: "Descripción",
      accessorKey: "description",
      cell: ({ row }) => safeText(row.original.description),
    },
  ];
}
