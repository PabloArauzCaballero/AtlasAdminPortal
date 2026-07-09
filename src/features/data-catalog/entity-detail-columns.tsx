"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  DataEntityColumn,
  DataEntityImpact,
  EndpointItem,
} from "@/features/systems/types";
import {
  PiiBadge,
  ReviewStatusBadge,
  RiskBadge,
} from "@/shared/components/ui/badges";
import { formatBoolean, safeText } from "@/shared/lib/format";

export function buildRelatedEndpointColumns(
  endpointsById?: Map<string, EndpointItem>,
): ColumnDef<DataEntityImpact>[] {
  return [
    {
      header: "Endpoint",
      accessorKey: "endpointId",
      cell: ({ row }) => (
        <EndpointCell
          impact={row.original}
          resolved={endpointsById?.get(row.original.endpointId)}
        />
      ),
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

export function buildColumnCatalogColumns(): ColumnDef<DataEntityColumn>[] {
  return [
    {
      header: "Columna",
      accessorKey: "columnName",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.columnName)}
        </span>
      ),
    },
    { header: "Tipo", accessorKey: "dataType" },
    {
      header: "Descripción",
      accessorKey: "businessDescription",
      cell: ({ row }) => columnDescription(row.original),
    },
    {
      header: "Nullable",
      accessorKey: "isNullable",
      cell: ({ row }) => formatBoolean(row.original.isNullable),
    },
    {
      header: "PII",
      accessorKey: "containsPii",
      cell: ({ row }) => <PiiBadge value={Boolean(row.original.containsPii)} />,
    },
    {
      header: "Uso ML",
      accessorKey: "usedInMl",
      cell: ({ row }) => formatBoolean(row.original.usedInMl),
    },
    {
      header: "Validación",
      accessorKey: "validationRule",
      cell: ({ row }) => safeText(row.original.validationRule ?? "—"),
    },
  ];
}

function EndpointCell({
  impact,
  resolved,
}: Readonly<{ impact: DataEntityImpact; resolved?: EndpointItem }>) {
  const endpointId = impact.endpoint?.endpointId ?? impact.endpointId;
  const method = impact.endpoint?.method ?? resolved?.method;
  const label =
    impact.endpoint?.fullPath ??
    impact.endpoint?.routePath ??
    resolved?.fullPath ??
    resolved?.routePath ??
    `#${endpointId}`;
  return (
    <Link
      className="block max-w-[360px] truncate font-mono text-xs text-blue-700 hover:underline"
      href={`/internal/systems/endpoints/${endpointId}`}
      title={resolved?.businessPurpose ?? undefined}
    >
      {method ? `${method} ` : ""}
      {safeText(label)}
    </Link>
  );
}

function columnDescription(column: DataEntityColumn) {
  return (
    column.businessDescription ??
    column.technicalDescription ??
    column.description ??
    column.businessName ??
    "Sin descripción registrada"
  );
}
