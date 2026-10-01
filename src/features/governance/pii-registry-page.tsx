"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDataEntities, useEndpoints } from "@/features/systems/hooks";
import { serverPagedColumns } from "@/shared/components/data-table/server-columns";
import type { DataEntity, EndpointItem } from "@/features/systems/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import {
  BooleanBadge,
  ModuleBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatBoolean, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

/**
 * Pestaña «Datos personales» de Gobierno de datos (antes `/internal/governance/pii`, que redirige).
 *
 * Antes bajaba el catálogo ENTERO de tablas y rutas —página a página, unas 13 peticiones— en cada
 * tecla del buscador y filtraba en el navegador. Ahora pide al servidor sólo lo que guarda o expone
 * datos personales (`personalData=true`), con el buscador y la paginación en el servidor.
 */
export function PiiRegistryTab() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [tablesPage, setTablesPage] = useState(1);
  const [routesPage, setRoutesPage] = useState(1);
  const entities = useDataEntities({
    personalData: "true",
    q,
    page: tablesPage,
    limit: 20,
  });
  const endpoints = useEndpoints({
    personalData: "true",
    q,
    page: routesPage,
    limit: 20,
  });

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
        header: "Pide sesión",
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
    <div className="space-y-6">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar tabla, esquema, entidad, módulo, responsable o ruta…"
        searchTooltip="Tablas: nombre, entidad, modelo, esquema, módulo y responsable. Rutas: código, ruta, nombre de ruta y propósito. Siempre dentro de lo que tiene datos personales."
        onSearchChange={(value) => {
          setQ(value);
          setTablesPage(1);
          setRoutesPage(1);
        }}
        onClear={() => {
          setQ("");
          setTablesPage(1);
          setRoutesPage(1);
        }}
      />
      <PiiCard
        title="Tablas con datos personales"
        description="Guardan datos personales, legales, de dispositivo o de ubicación."
        query={entities}
        columns={entityColumns}
        onPageChange={setTablesPage}
        emptyTitle="No hay tablas con datos personales para esta búsqueda."
      />
      <PiiCard
        title="Rutas con datos personales"
        description="Rutas que el catálogo marca con datos personales o que declaran campos personales."
        query={endpoints}
        columns={endpointColumns}
        onPageChange={setRoutesPage}
        emptyTitle="No hay rutas con datos personales para esta búsqueda."
      />
    </div>
  );
}

type PagedQuery<T> = {
  data?: { items: T[]; meta: Parameters<typeof DataTable<T>>[0]["meta"] };
  isLoading: boolean;
  error: unknown;
  refetch: () => unknown;
};

function PiiCard<T>({
  title,
  description,
  query,
  columns,
  onPageChange,
  emptyTitle,
}: Readonly<{
  title: string;
  description: string;
  query: PagedQuery<T>;
  columns: ColumnDef<T>[];
  onPageChange: (page: number) => void;
  emptyTitle: string;
}>) {
  const total = query.data?.meta?.total;
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title={
            total === undefined ? title : `${title} (${formatNumber(total)})`
          }
          description={description}
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        {query.isLoading ? <LoadingSkeleton rows={4} /> : null}
        {query.error ? (
          <ErrorState
            description={
              isAtlasApiError(query.error)
                ? query.error.message
                : "No se pudo cargar el registro de datos personales."
            }
            requestId={
              isAtlasApiError(query.error) ? query.error.requestId : undefined
            }
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {query.data ? (
          <DataTable
            data={query.data.items}
            columns={serverPagedColumns(columns)}
            meta={query.data.meta}
            onPageChange={onPageChange}
            emptyTitle={emptyTitle}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
