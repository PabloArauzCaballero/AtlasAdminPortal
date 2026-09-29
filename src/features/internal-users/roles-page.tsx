"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useInternalRoles } from "./hooks";
import { filterRoles } from "./catalog-filter";
import type { InternalRole } from "./types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
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
  // Catálogo completo: el servidor no pagina los roles ni lee `page`/`limit`.
  const roles = useInternalRoles();
  const [q, setQ] = useState("");
  const todos = useMemo(() => roles.data?.items ?? [], [roles.data]);
  const visibles = useMemo(() => filterRoles(todos, q), [todos, q]);
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
        eyebrow="Roles y permisos"
        title="Roles internos"
        description={`Catálogo completo${roles.data ? ` (${formatNumber(todos.length)} roles)` : ""}: los roles que se pueden asignar a una cuenta interna y cuántos permisos da cada uno. Para ver quién tiene un rol, abre Usuarios internos y filtra por él.`}
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre o descripción del rol…"
        searchTooltip="Recorre el catálogo completo de roles, que llega entero del servidor: coincide con parte del código, del nombre o de la descripción."
        onSearchChange={setQ}
        onClear={() => setQ("")}
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
          data={visibles}
          columns={columns}
          emptyTitle={
            todos.length === 0
              ? "No hay roles internos registrados."
              : "Ningún rol coincide con la búsqueda."
          }
        />
      ) : null}
    </>
  );
}
