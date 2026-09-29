"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useInternalPermissions } from "./hooks";
import { filterPermissions, permissionModules } from "./catalog-filter";
import type { InternalPermission } from "./types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { ModuleBadge, StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";
import { KeyRound } from "lucide-react";

export function PermissionsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["internal.permissions.read"]}>
      <AuthorizedPermissionsPage />
    </PermissionGate>
  );
}

function AuthorizedPermissionsPage() {
  // Sin `page` ni `limit`: el servidor devuelve el catálogo entero y no los lee. Mandarlos hacía
  // creer que había una página 2 que nadie pedía.
  const permissions = useInternalPermissions();
  const [q, setQ] = useState("");
  const [module, setModule] = useState("");
  const todos = useMemo(
    () => permissions.data?.items ?? [],
    [permissions.data],
  );
  const visibles = useMemo(
    () => filterPermissions(todos, q, module),
    [todos, q, module],
  );
  const moduleOptions = useMemo(
    () =>
      permissionModules(todos).map((valor) => ({
        value: valor,
        label: valor,
        description: `Permisos del módulo ${valor} del catálogo interno.`,
      })),
    [todos],
  );
  const columns = useMemo<ColumnDef<InternalPermission>[]>(
    () => [
      {
        header: "Permiso",
        accessorKey: "key",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">
            {row.original.key}
          </span>
        ),
      },
      {
        header: "Módulo",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      { header: "Acción", accessorKey: "action" },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Descripción",
        cell: ({ row }) => safeText(row.original.description),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        icon={KeyRound}
        eyebrow="Roles y permisos"
        title="Permisos internos"
        description={
          permissions.data
            ? `Catálogo completo: ${formatNumber(todos.length)} permisos que usan el portal y el servicio interno. La búsqueda y el filtro recorren el catálogo entero.`
            : "Catálogo completo de permisos que usan el portal y el servicio interno."
        }
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por permiso, módulo, acción o descripción…"
        searchTooltip="Recorre el catálogo completo, que llega entero del servidor: coincide con parte del código del permiso, su módulo, su acción o su descripción."
        filters={[
          {
            name: "module",
            label: "Módulo",
            value: module,
            options: moduleOptions,
            tooltip: "Deja sólo los permisos de un área del sistema.",
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(nombre, valor) => {
          if (nombre === "module") setModule(valor);
        }}
        onClear={() => {
          setQ("");
          setModule("");
        }}
      />
      {permissions.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {permissions.error ? (
        <ErrorState
          description={
            isAtlasApiError(permissions.error)
              ? permissions.error.message
              : "No se pudo cargar permisos internos."
          }
          requestId={
            isAtlasApiError(permissions.error)
              ? permissions.error.requestId
              : undefined
          }
          onRetry={() => void permissions.refetch()}
        />
      ) : null}
      {permissions.data ? (
        <DataTable
          data={visibles}
          columns={columns}
          emptyTitle={
            todos.length === 0
              ? "No hay permisos internos registrados."
              : "Ningún permiso coincide con la búsqueda."
          }
        />
      ) : null}
    </>
  );
}
