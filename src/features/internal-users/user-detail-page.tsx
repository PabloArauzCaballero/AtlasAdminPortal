"use client";

import { useInternalUser } from "./hooks";
import { UserEditForm } from "./user-edit-form";
import { UserRolesForm } from "./user-roles-form";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function UserDetailPage(props: Readonly<{ internalUserId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["internal.users.read"]}>
      <AuthorizedUserDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedUserDetailPage({
  internalUserId,
}: Readonly<{ internalUserId: string }>) {
  const user = useInternalUser(internalUserId);
  return (
    <>
      {user.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {user.error ? (
        <ErrorState
          description={
            isAtlasApiError(user.error)
              ? user.error.message
              : "No se pudo cargar usuario interno."
          }
          requestId={
            isAtlasApiError(user.error) ? user.error.requestId : undefined
          }
          onRetry={() => void user.refetch()}
        />
      ) : null}
      {user.data ? (
        <>
          <PageHeader
            eyebrow={`Usuario interno #${user.data.user.id}`}
            title={user.data.user.fullName}
            description={user.data.user.email}
            actions={<StatusBadge value={user.data.user.status} />}
          />
          <div className="space-y-6">
            <KeyValueGrid
              items={[
                { label: "Tenant", value: user.data.user.tenantId, mono: true },
                { label: "Código", value: user.data.user.userCode, mono: true },
                { label: "Departamento", value: user.data.user.department },
                { label: "Cargo", value: user.data.user.jobTitle },
                {
                  label: "MFA",
                  value: formatBoolean(user.data.user.mfaEnabled),
                },
                {
                  label: "Debe cambiar contraseña",
                  value: formatBoolean(user.data.user.mustChangePassword),
                },
                { label: "Roles", value: user.data.user.roles.join(", ") },
                { label: "Permisos", value: user.data.user.permissions.length },
              ]}
            />
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Permisos efectivos"
                  description="Permisos devueltos por `/internal/users/:id`. No se infieren desde la interfaz."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent>
                <JsonViewer
                  value={{
                    roles: user.data.user.roles,
                    permissions: user.data.user.permissions,
                  }}
                />
              </CardContent>
            </Card>
            <PermissionGate
              permissions={["internal.users.manage"]}
              fallback={null}
            >
              <UserRolesForm user={user.data.user} />
              <UserEditForm user={user.data.user} />
            </PermissionGate>
          </div>
        </>
      ) : null}
    </>
  );
}
