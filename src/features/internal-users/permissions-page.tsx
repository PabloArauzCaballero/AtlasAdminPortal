"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useInternalPermissions } from "./hooks";
import type { InternalPermission } from "./types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { ModuleBadge, StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { safeText } from "@/shared/lib/format";

export function PermissionsPage() {
  const permissions = useInternalPermissions({ page: 1, limit: 200 });
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
    <PermissionGate permissions={["internal.permissions.read"]}>
      <PageHeader
        eyebrow="RBAC"
        title="Permisos internos"
        description="Catálogo granular de permisos usados por el portal y el servicio interno."
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
          data={permissions.data.items}
          columns={columns}
          meta={permissions.data.pagination}
          emptyTitle="No hay permisos internos registrados."
        />
      ) : null}
    </PermissionGate>
  );
}
