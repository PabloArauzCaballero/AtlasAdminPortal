"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTools } from "@/features/systems/hooks";
import type { ToolItem } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatBoolean } from "@/shared/lib/format";
import { uniqueTextOptions } from "@/shared/lib/options";
import { isAtlasApiError } from "@/shared/api/errors";

export function ToolsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.tools.read"]}>
      <AuthorizedToolsPage />
    </PermissionGate>
  );
}

function AuthorizedToolsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const tools = useTools({ page, limit: 20, q, status });
  const items = useMemo(() => tools.data?.items ?? [], [tools.data?.items]);
  const statusOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.status)),
    [items],
  );
  const columns = useMemo<ColumnDef<ToolItem>[]>(
    () => [
      {
        header: "Código",
        accessorKey: "code",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-blue-700 hover:underline"
            href={`/internal/systems/tools/${row.original.toolId}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { header: "Nombre", accessorKey: "name" },
      { header: "Tipo", accessorKey: "type" },
      { header: "Proveedor", accessorKey: "provider" },
      {
        header: "Crítica",
        accessorKey: "isCritical",
        cell: ({ row }) => formatBoolean(row.original.isCritical),
      },
      {
        header: "Credenciales",
        accessorKey: "requiresCredentials",
        cell: ({ row }) => formatBoolean(row.original.requiresCredentials),
      },
      {
        header: "Sandbox",
        accessorKey: "hasSandbox",
        cell: ({ row }) => formatBoolean(row.original.hasSandbox),
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
        eyebrow="Herramientas"
        title="Herramientas internas"
        description="Catálogo de herramientas técnicas requeridas por endpoints. No se muestran valores de variables de entorno ni secretos."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre o proveedor…"
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("");
          setPage(1);
        }}
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
          },
        ]}
      />
      {tools.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {tools.error ? (
        <ErrorState
          description={
            isAtlasApiError(tools.error)
              ? tools.error.message
              : "No se pudo cargar herramientas."
          }
          requestId={
            isAtlasApiError(tools.error) ? tools.error.requestId : undefined
          }
          onRetry={() => void tools.refetch()}
        />
      ) : null}
      {tools.data ? (
        <DataTable
          data={items}
          columns={columns}
          meta={tools.data.meta}
          onPageChange={setPage}
        />
      ) : null}
    </>
  );
}
