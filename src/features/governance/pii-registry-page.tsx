"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useWholeCatalog } from "./hooks";
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
import { ShieldAlert } from "lucide-react";

export function PiiRegistryPage() {
  // El gate envuelve a un componente aparte a propósito. Si los hooks vivieran
  // en este cuerpo, las queries saldrían durante el render, antes de que el gate
  // pudiera decidir: un usuario sin `governance.data.read` dispararía igual las
  // peticiones que traen datos personales. Ocultar la UI no es autorizar.
  return (
    <PermissionGate permissions={["governance.data.read"]}>
      <AuthorizedPiiRegistryPage />
    </PermissionGate>
  );
}

function AuthorizedPiiRegistryPage() {
  const [q, setQ] = useState("");
  const catalog = useWholeCatalog(q);
  const error = catalog.error;
  const piiEntities = (catalog.data?.entities.items ?? []).filter(
    (item) =>
      item.containsPii ||
      item.containsLegalData ||
      item.containsLocationData ||
      item.containsDeviceData,
  );
  const piiEndpoints = (catalog.data?.endpoints.items ?? []).filter(
    (item) => item.containsPii || item.piiFields.length > 0,
  );

  const entityColumns = useMemo<ColumnDef<DataEntity>[]>(
    () => [
      {
        header: "Tabla",
        accessorKey: "tableName",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-atlas-accent underline"
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
        header: "Datos personales",
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
        header: "Dispositivo",
        accessorKey: "containsDeviceData",
        cell: ({ row }) => (
          <BooleanBadge value={row.original.containsDeviceData} />
        ),
      },
      {
        header: "Ubicación",
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
        header: "Ruta",
        accessorKey: "fullPath",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-atlas-accent underline"
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
        header: "Datos personales",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
      {
        header: "Campos personales",
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
    <>
      <PageHeader
        icon={ShieldAlert}
        eyebrow="Gobierno"
        title="Registro de datos personales"
        description="Las tablas que guardan y las rutas que exponen datos personales o sensibles, según el catálogo real completo."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar tabla, ruta, dominio o campo…"
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />
      {catalog.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar el registro de datos personales."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => void catalog.refetch()}
        />
      ) : null}
      {catalog.data ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <SectionHeader
                title="Tablas sensibles"
                description="Con datos personales, legales, de dispositivo o de ubicación."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={piiEntities}
                columns={entityColumns}
                emptyTitle="No hay tablas sensibles para esta búsqueda."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Rutas con datos personales"
                description="Rutas que el catálogo marca con datos personales o con campos personales."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={piiEndpoints}
                columns={endpointColumns}
                emptyTitle="No hay rutas con datos personales para esta búsqueda."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
