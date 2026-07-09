"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useInternalUsers } from "./hooks";
import type { InternalUserListItem } from "./types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function UsersPage() {
  const [search, setSearch] = useState("");
  const users = useInternalUsers();
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
            className="text-blue-700 hover:underline"
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
    <PermissionGate permissions={["internal.users.read"]}>
      <PageHeader
        eyebrow="Fase 2"
        title="Usuarios internos"
        description="Listado de usuarios internos desde `/internal/users`. No se inventan roles: se muestran únicamente los que devuelve el servicio interno."
      />
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
    </PermissionGate>
  );
}
