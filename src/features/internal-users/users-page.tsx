"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useInternalUsers } from "./hooks";
import type { InternalUserListItem } from "./types";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function UsersPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["internal.users.read"]}>
      <AuthorizedUsersPage />
    </PermissionGate>
  );
}

function AuthorizedUsersPage() {
  const [search, setSearch] = useState("");
  const users = useInternalUsers();
  const { hasPermission } = useAuth();
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = users.data?.items ?? [];
    if (!q) return items;
    return items.filter((user) =>
      [
        user.email,
        user.fullName,
        user.department,
        user.jobTitle,
        user.roles.join(" "),
      ].some((value) => (value ?? "").toLowerCase().includes(q)),
    );
  }, [search, users.data?.items]);

  const columns = useMemo<ColumnDef<InternalUserListItem>[]>(
    () => [
      {
        header: "Usuario",
        accessorKey: "email",
        cell: ({ row }) => (
          <Link
            className="text-blue-700 underline"
            href={`/internal/settings/users/${row.original.id}`}
          >
            {row.original.email}
          </Link>
        ),
      },
      { header: "Nombre", accessorKey: "fullName" },
      { header: "Departamento", accessorKey: "department" },
      { header: "Cargo", accessorKey: "jobTitle" },
      {
        header: "Roles",
        accessorKey: "roles",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.roles.join(", ") || "—"}
          </span>
        ),
      },
      {
        header: "MFA",
        accessorKey: "mfaEnabled",
        cell: ({ row }) => formatBoolean(row.original.mfaEnabled),
      },
      {
        header: "Cambio pass",
        accessorKey: "mustChangePassword",
        cell: ({ row }) => formatBoolean(row.original.mustChangePassword),
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
        eyebrow="Usuarios internos"
        title="Usuarios internos"
        description="Listado de usuarios internos desde `/internal/users`. No se inventan roles: se muestran únicamente los que devuelve el servicio interno."
        actions={
          hasPermission("internal.users.manage") ? (
            <Link href="/internal/settings/users/new">
              <Button variant="primary">Nuevo usuario</Button>
            </Link>
          ) : undefined
        }
      />
      <BusinessContextNote>
        Cada persona con acceso al backoffice puede ver datos de clientes,
        aprobar/rechazar decisiones o tocar configuración crítica. Esta pantalla
        existe para saber quién tiene acceso a qué, y para poder desactivar a
        alguien de inmediato (con motivo auditable) si deja el equipo o su
        cuenta se ve comprometida.
      </BusinessContextNote>
      <FilterBar
        search={search}
        searchPlaceholder="Buscar usuario, rol, departamento…"
        onSearchChange={setSearch}
        onClear={() => setSearch("")}
      />
      {users.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {users.error ? (
        <ErrorState
          description={
            isAtlasApiError(users.error)
              ? users.error.message
              : "No se pudo cargar usuarios internos."
          }
          requestId={
            isAtlasApiError(users.error) ? users.error.requestId : undefined
          }
          onRetry={() => void users.refetch()}
        />
      ) : null}
      {users.data ? (
        <DataTable
          data={filtered}
          columns={columns}
          emptyTitle="No hay usuarios internos para los filtros actuales."
        />
      ) : null}
    </>
  );
}
