"use client";

import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badges";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { formatBoolean } from "@/shared/lib/format";

export function ProfilePage() {
  const { user, roles, permissions } = useAuth();

  return (
    <PermissionGate permissions={[]}>
      <PageHeader
        title="Perfil interno"
        description="Sesión, roles y permisos efectivos recibidos desde `/internal/auth/me`."
      />
      {user ? (
        <div className="space-y-6">
          <KeyValueGrid
            items={[
              { label: "Usuario", value: user.fullName },
              { label: "Email", value: user.email, mono: true },
              { label: "Tenant", value: user.tenantId, mono: true },
              { label: "Código", value: user.userCode, mono: true },
              { label: "Departamento", value: user.department },
              { label: "Cargo", value: user.jobTitle },
              { label: "Estado", value: user.status },
              {
                label: "MFA habilitado",
                value: formatBoolean(user.mfaEnabled),
              },
              {
                label: "Debe cambiar password",
                value: formatBoolean(user.mustChangePassword),
              },
            ]}
          />
          <Card>
            <CardContent>
              <SectionHeader title="Roles" />{" "}
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge key={role}>{role}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <SectionHeader
                title="Permisos"
                description="El menú y acciones se renderizan con estos permisos, no con roles hardcodeados."
              />{" "}
              <div className="flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <Badge key={permission} tone="info" className="font-mono">
                    {permission}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PermissionGate>
  );
}
