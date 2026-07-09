"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDataEntities } from "@/features/systems/hooks";
import type { DataEntity } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  ModuleBadge,
  PiiBadge,
  ReviewStatusBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

const reviewOptions = [
  { label: "Auto detectado", value: "AUTO_DETECTED" },
  { label: "Necesita revisión", value: "NEEDS_REVIEW" },
  { label: "Aprobado", value: "APPROVED" },
  { label: "Rechazado", value: "REJECTED" },
];

export function DataEntitiesPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(initialQ);
  const [reviewStatus, setReviewStatus] = useState("");
  const entities = useDataEntities({ page, limit: 20, q, reviewStatus });

  const columns = useMemo<ColumnDef<DataEntity>[]>(
    () => [
      {
        header: "Schema",
        accessorKey: "schemaName",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.schemaName}</span>
        ),
      },
      {
        header: "Tabla",
        accessorKey: "tableName",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs font-semibold text-blue-700 hover:underline"
            href={`/internal/data-catalog/tables/${row.original.entityId}`}
          >
            {row.original.tableName}
          </Link>
        ),
      },
      {
        header: "Entidad",
        accessorKey: "entityName",
        cell: ({ row }) => row.original.entityName ?? "—",
      },
      {
        header: "Módulo",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      {
        header: "Owner",
        accessorKey: "dataOwner",
        cell: ({ row }) => row.original.dataOwner ?? "—",
      },
      {
        header: "PII",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
      {
        header: "Financiera",
        accessorKey: "containsFinancialData",
        cell: ({ row }) => formatBoolean(row.original.containsFinancialData),
      },
      {
        header: "Riesgo",
        accessorKey: "containsRiskData",
        cell: ({ row }) => formatBoolean(row.original.containsRiskData),
      },
      {
        header: "Audit critical",
        accessorKey: "isAuditCritical",
        cell: ({ row }) => formatBoolean(row.original.isAuditCritical),
      },
      {
        header: "Retención",
        accessorKey: "retentionPolicyCode",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.retentionPolicyCode ?? "—"}
          </span>
        ),
      },
      {
        header: "Review",
        accessorKey: "reviewStatus",
        cell: ({ row }) => (
          <ReviewStatusBadge value={row.original.reviewStatus} />
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <PermissionGate permissions={["catalog.data.read"]}>
      <PageHeader
        title="Catálogo de datos"
        description="Tablas y entidades detectadas desde `/systems/data-entities`."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar tabla, entidad, módulo u owner…"
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "reviewStatus") setReviewStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setReviewStatus("");
          setPage(1);
        }}
        filters={[
          {
            name: "reviewStatus",
            label: "Revisión",
            value: reviewStatus,
            options: reviewOptions,
          },
        ]}
      />
      {entities.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {entities.error ? (
        <ErrorState
          description={
            isAtlasApiError(entities.error)
              ? entities.error.message
              : "No se pudo cargar el catálogo de datos."
          }
          requestId={
            isAtlasApiError(entities.error)
              ? entities.error.requestId
              : undefined
          }
          onRetry={() => void entities.refetch()}
        />
      ) : null}
      {entities.data ? (
        <DataTable
          data={entities.data.items}
          columns={columns}
          meta={entities.data.meta}
          onPageChange={setPage}
        />
      ) : null}
    </PermissionGate>
  );
}
