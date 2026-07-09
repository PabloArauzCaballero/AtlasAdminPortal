"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useDataEntities, useEndpoints } from "@/features/systems/hooks";
import type { DataEntity, EndpointItem } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import {
  BooleanBadge,
  ModuleBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function PiiRegistryPage() {
  const [q, setQ] = useState("");
  const entities = useDataEntities({ page: 1, limit: 100, q });
  const endpoints = useEndpoints({ page: 1, limit: 100, q });
  const error = entities.error ?? endpoints.error;
  const piiEntities = (entities.data?.items ?? []).filter(
    (item) =>
      item.containsPii ||
      item.containsLegalData ||
      item.containsLocationData ||
      item.containsDeviceData,
  );
  const piiEndpoints = (endpoints.data?.items ?? []).filter(
    (item) => item.containsPii || item.piiFields.length > 0,
  );

  const entityColumns = useMemo<ColumnDef<DataEntity>[]>(
    () => [
      {
        header: "Tabla",
        accessorKey: "tableName",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-blue-700 hover:underline"
            href={`/internal/data-catalog/tables/${row.original.entityId}`}
          >
            {row.original.schemaName}.{row.original.tableName}
          </Link>
        ),
      },
      {
        header: "Dominio",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      {
        header: "PII",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
      {
        header: "Legal",
        accessorKey: "containsLegalData",
        cell: ({ row }) => (
          <BooleanBadge value={row.original.containsLegalData} />
        ),
      },
      {
        header: "Device",
        accessorKey: "containsDeviceData",
        cell: ({ row }) => (
          <BooleanBadge value={row.original.containsDeviceData} />
        ),
      },
      {
        header: "Location",
        accessorKey: "containsLocationData",
        cell: ({ row }) => (
          <BooleanBadge value={row.original.containsLocationData} />
        ),
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
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
    ],
    [],
  );

  const endpointColumns = useMemo<ColumnDef<EndpointItem>[]>(
    () => [
      {
        header: "Endpoint",
        accessorKey: "fullPath",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-blue-700 hover:underline"
            href={`/internal/systems/endpoints/${row.original.endpointId}`}
          >
            {row.original.method} {row.original.fullPath}
          </Link>
        ),
      },
      {
        header: "Dominio",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      {
        header: "Riesgo",
        accessorKey: "riskLevel",
        cell: ({ row }) => <RiskBadge value={row.original.riskLevel} />,
      },
      {
        header: "PII",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
      {
        header: "Campos PII",
        accessorKey: "piiFields",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.piiFields.length
              ? row.original.piiFields.join(", ")
              : "—"}
          </span>
        ),
      },
      {
        header: "Auth",
        accessorKey: "requiresAuth",
        cell: ({ row }) => formatBoolean(row.original.requiresAuth),
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
    <PermissionGate permissions={["governance.data.read"]}>
      <PageHeader
        eyebrow="Gobierno"
        title="PII registry"
        description="Registro dinámico de tablas y endpoints que contienen o exponen datos personales/sensibles según catálogo real."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar tabla, endpoint, dominio o campo…"
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />
      {entities.isLoading || endpoints.isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar PII registry."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => {
            void entities.refetch();
            void endpoints.refetch();
          }}
        />
      ) : null}
      {entities.data && endpoints.data ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <SectionHeader
                title="Tablas sensibles"
                description="Incluye PII, legal, dispositivo y ubicación."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={piiEntities}
                columns={entityColumns}
                emptyTitle="No hay tablas sensibles para el filtro aplicado."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Endpoints con PII"
                description="Endpoints que declaran PII o campos PII en el catálogo."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={piiEndpoints}
                columns={endpointColumns}
                emptyTitle="No hay endpoints con PII para el filtro aplicado."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PermissionGate>
  );
}
