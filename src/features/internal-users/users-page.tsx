"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useInternalRoles, useInternalUsers } from "./hooks";
import { USER_STATUS_OPTIONS } from "./labels";
import { buildInternalUserColumns } from "./users-columns";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { isAtlasApiError } from "@/shared/api/errors";
import type { PaginationMeta } from "@/shared/api/types";
import type { InternalUsersListResponse } from "./types";
import { usePageSize } from "@/shared/lib/page-size";

const POR_PAGINA = 25;

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

/**
 * La paginación que devuelve el servidor. Un backend anterior al 2026-09-29 no mandaba `meta` ni
 * filtraba: entonces se pinta sin pie de página en vez de inventar un total.
 */
function paginacionDe(
  respuesta: InternalUsersListResponse | undefined,
): PaginationMeta | undefined {
  return respuesta?.meta ?? respuesta?.pagination;
}

function AuthorizedUsersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  // Todo viaja al servidor: con más de una página de personas, filtrar en el navegador sólo
  // encontraba a quien casualmente estuviera en la página cargada.
  const users = useInternalUsers({
    page,
    limit: usePageSize(POR_PAGINA),
    q: q.trim(),
    status,
    role,
  });
  // El catálogo de roles es completo (no paginado): de él salen las opciones del filtro, no de
  // los roles que aparecen en la página de personas.
  const roles = useInternalRoles();
  const { hasPermission } = useAuth();
  const columns = useMemo(() => buildInternalUserColumns(), []);
  const roleOptions = useMemo(
    () =>
      (roles.data?.items ?? []).map((rol) => ({
        value: rol.code,
        label: rol.name || rol.code,
        description:
          rol.description?.trim() ||
          `Cuentas que tienen asignado el rol ${rol.code}.`,
      })),
    [roles.data],
  );

  return (
    <>
      <PageHeader
        icon={Users}
        eyebrow="Usuarios internos"
        title="Usuarios internos"
        description="Las personas con acceso a este portal, con sus roles y el estado de su cuenta."
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
        search={q}
        searchPlaceholder="Buscar por correo, nombre, departamento, cargo o rol…"
        searchTooltip="Busca en todo el equipo, no sólo en esta página: coincide con parte del correo, del nombre, del departamento, del cargo o del código de un rol asignado."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: USER_STATUS_OPTIONS,
            tooltip:
              "Deja sólo las cuentas en ese estado, por ejemplo las suspendidas.",
          },
          {
            name: "role",
            label: "Rol",
            value: role,
            options: roleOptions,
            tooltip: "Deja sólo a quien tiene ese rol asignado y vigente hoy.",
          },
        ]}
        onSearchChange={(valor) => {
          setQ(valor);
          setPage(1);
        }}
        onFilterChange={(nombre, valor) => {
          if (nombre === "status") setStatus(valor);
          if (nombre === "role") setRole(valor);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("");
          setRole("");
          setPage(1);
        }}
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
          data={users.data.items}
          columns={columns}
          meta={paginacionDe(users.data)}
          onPageChange={setPage}
          emptyTitle="No hay usuarios internos para los filtros actuales."
          emptyDescription="Prueba con otra búsqueda o quita los filtros de estado y rol."
        />
      ) : null}
    </>
  );
}
