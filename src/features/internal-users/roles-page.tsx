"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useInternalRoles } from "./hooks";
import type { InternalRole } from "./types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Card, CardContent } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";

export function RolesPage() {
  const roles = useInternalRoles({ page: 1, limit: 100 });
  const columns = useMemo<ColumnDef<InternalRole>[]>(
    () => [
      {
        header: "Rol",
        accessorKey: "code",
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-xs font-semibold">
              {row.original.code}
            </p>
            <p className="text-xs text-atlas-muted">
              {safeText(row.original.name)}
            </p>
          </div>
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Usuarios",
        accessorKey: "userCount",
        cell: ({ row }) => formatNumber(row.original.userCount ?? 0),
      },
      {
        header: "Permisos",
        cell: ({ row }) => formatNumber(row.original.permissions.length),
      },
      {
        header: "Descripción",
        cell: ({ row }) => safeText(row.original.description),
      },
    ],
    [],
  );

  return (
    <PermissionGate permissions={["internal.roles.read"]}>
      <PageHeader
        eyebrow="RBAC"
        title="Roles internos"
        description="Catálogo real de roles internos devuelto por el servicio. Ya no se deriva desde usuarios."
      />
      <Card className="mb-4">
        <CardContent>
          <p className="text-sm text-atlas-muted">
            Esta pantalla usa `/internal/roles` como contrato oficial. Si un rol
            no aparece aquí, no debe asumirse en el portal.
          </p>
        </CardContent>
      </Card>
      {roles.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {roles.error ? (
        <ErrorState
          description={
            isAtlasApiError(roles.error)
              ? roles.error.message
              : "No se pudo cargar el catálogo de roles."
          }
          requestId={
            isAtlasApiError(roles.error) ? roles.error.requestId : undefined
          }
          onRetry={() => void roles.refetch()}
        />
      ) : null}
      {roles.data ? (
        <DataTable
          data={roles.data.items}
          columns={columns}
          meta={roles.data.pagination}
          emptyTitle="No hay roles internos registrados."
        />
      ) : null}
    </PermissionGate>
  );
}
