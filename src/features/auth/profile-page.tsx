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
import { PasswordChangeCard } from "./password-change-card";
import { UserCircle } from "lucide-react";

export function ProfilePage() {
  const { user, roles, permissions } = useAuth();

  return (
    <PermissionGate permissions={[]}>
      <PageHeader
        icon={UserCircle}
        title="Perfil interno"
        description="Tu cuenta, tus roles y lo que puedes hacer en este portal."
      />
      {user ? (
        <div className="space-y-6">
          <KeyValueGrid
            items={[
              { label: "Usuario", value: user.fullName },
              { label: "Email", value: user.email, mono: true },
              { label: "Organización", value: user.tenantId, mono: true },
              { label: "Código", value: user.userCode, mono: true },
              { label: "Departamento", value: user.department },
              { label: "Cargo", value: user.jobTitle },
              { label: "Estado", value: user.status },
              {
                label: "Segundo factor",
                value: formatBoolean(user.mfaEnabled),
              },
              {
                label: "Debe cambiar contraseña",
                value: formatBoolean(user.mustChangePassword),
              },
            ]}
          />
          <PasswordChangeCard />
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
                description="El menú y las acciones que ves salen de estos permisos."
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
