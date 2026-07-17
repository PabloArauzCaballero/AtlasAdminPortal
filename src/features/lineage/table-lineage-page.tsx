"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTableImpact } from "@/features/systems/hooks";
import type { DataEntityImpact } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ReviewStatusBadge, RiskBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatBoolean, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function TableLineagePage(
  props: Readonly<{ schemaName: string; tableName: string }>,
) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["lineage.read"]}>
      <AuthorizedTableLineagePage {...props} />
    </PermissionGate>
  );
}

function AuthorizedTableLineagePage({
  schemaName,
  tableName,
}: Readonly<{ schemaName: string; tableName: string }>) {
  const impact = useTableImpact(schemaName, tableName);

  const columns = useMemo<ColumnDef<DataEntityImpact>[]>(
    () => [
      {
        header: "Endpoint",
        accessorKey: "endpointId",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs font-semibold text-blue-700 hover:underline"
            href={`/internal/systems/endpoints/${row.original.endpointId}`}
          >
            Endpoint #{row.original.endpointId}
          </Link>
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
        header: "Transaccional",
        accessorKey: "isTransactional",
        cell: ({ row }) => formatBoolean(row.original.isTransactional),
      },
      {
        header: "Rollback",
        accessorKey: "rollbackRequired",
        cell: ({ row }) => formatBoolean(row.original.rollbackRequired),
      },
      {
        header: "Cliente",
        accessorKey: "affectsCustomerState",
        cell: ({ row }) => formatBoolean(row.original.affectsCustomerState),
      },
      {
        header: "Financiero",
        accessorKey: "affectsFinancialState",
        cell: ({ row }) => formatBoolean(row.original.affectsFinancialState),
      },
      {
        header: "Riesgo",
        accessorKey: "affectsRiskState",
        cell: ({ row }) => formatBoolean(row.original.affectsRiskState),
      },
      {
        header: "Legal",
        accessorKey: "affectsLegalState",
        cell: ({ row }) => formatBoolean(row.original.affectsLegalState),
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
    ],
    [],
  );

  const entity = impact.data?.entity;
  const endpointImpacts = impact.data?.endpointImpacts ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Lineage por tabla"
        title={`${schemaName}.${tableName}`}
        description="Impacto por endpoint obtenido desde `/systems/impact/by-table/:schemaName/:tableName`."
      />
      {impact.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {impact.error ? (
        <ErrorState
          description={
            isAtlasApiError(impact.error)
              ? impact.error.message
              : "No se pudo cargar impacto por tabla."
          }
          requestId={
            isAtlasApiError(impact.error) ? impact.error.requestId : undefined
          }
          onRetry={() => void impact.refetch()}
        />
      ) : null}
      {impact.data ? (
        <div className="space-y-6">
          {entity ? (
            <KeyValueGrid
              items={[
                { label: "Nombre de negocio", value: entity.entityName },
                { label: "Módulo", value: entity.module },
                { label: "Propósito", value: entity.businessPurpose },
                { label: "Owner", value: entity.dataOwner },
                { label: "PII", value: formatBoolean(entity.containsPii) },
                {
                  label: "Financiera",
                  value: formatBoolean(entity.containsFinancialData),
                },
                {
                  label: "Riesgo",
                  value: formatBoolean(entity.containsRiskData),
                },
                {
                  label: "Legal",
                  value: formatBoolean(entity.containsLegalData),
                },
                {
                  label: "Auditoría crítica",
                  value: formatBoolean(entity.isAuditCritical),
                },
                { label: "Retención", value: entity.retentionPolicyCode },
                { label: "Review", value: entity.reviewStatus },
                {
                  label: "Endpoints relacionados",
                  value: formatNumber(endpointImpacts.length),
                },
              ]}
            />
          ) : null}

          <Card>
            <CardHeader>
              <SectionHeader
                title="Endpoints que afectan esta tabla"
                description="Operaciones registradas por el catálogo de impacto."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={endpointImpacts}
                columns={columns}
                emptyTitle="No hay impactos registrados para esta tabla."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Payload técnico de lineage"
                description="Disponible para QA/sistemas. No debe exponerse fuera del portal interno."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <JsonViewer value={impact.data} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
