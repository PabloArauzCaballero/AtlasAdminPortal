"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useInternalRoles } from "./hooks";
import type { InternalRole } from "./types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";
import { ShieldCheck } from "lucide-react";

export function RolesPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["internal.roles.read"]}>
      <AuthorizedRolesPage />
    </PermissionGate>
  );
}

function AuthorizedRolesPage() {
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
      /*
       * No hay columna «Usuarios»: `GET /internal/roles` no devuelve cuántas cuentas tienen cada
       * rol, y la columna pintaba 0 en TODOS —también en SUPER_ADMIN, que en TEST tiene tres—.
       * Una cifra que siempre es cero no informa: afirma que nadie tiene el rol.
       */
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
    <>
      <PageHeader
        icon={ShieldCheck}
        eyebrow="RBAC"
        title="Roles internos"
        description="Los roles que se pueden asignar a una cuenta interna y cuántos permisos da cada uno. Para ver quién tiene un rol, abre Usuarios internos."
      />
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
    </>
  );
}
