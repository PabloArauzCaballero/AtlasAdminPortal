"use client";

import { LockKeyhole } from "lucide-react";
import { useMemo } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { useAuth } from "@/shared/auth/auth-context";
import {
  getInternalAuthStorageMode,
  isCookieBackedSession,
} from "@/shared/auth/auth-session-policy";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import { buildSessionChecks } from "./session-checks";
import { SessionChecksTable } from "./session-checks-table";

export function SessionSecurityPage() {
  const { session, user, permissions, roles } = useAuth();
  const checks = useMemo(() => buildSessionChecks(session), [session]);
  const blocked = checks.filter((check) => check.status === "blocked").length;
  const warnings = checks.filter((check) => check.status === "warning").length;

  return (
    <PermissionGate permissions={[]}>
      <PageHeader
        icon={LockKeyhole}
        eyebrow="Seguridad de sesiones"
        title="Seguridad de sesión"
        description="Revisión operativa de autenticación interna, cookies, MFA y permisos efectivos antes de producción."
      />
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Permisos" value={permissions.length} />
        <MetricCard label="Roles" value={roles.length} />
        <MetricCard label="Alertas" value={warnings} />
        <MetricCard label="Bloqueos" value={blocked} />
      </section>
      <div className="mt-6 grid gap-4 grid-cols-1 xl:grid-cols-[1.3fr_1fr]">
        <SessionChecksTable checks={checks} />
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Perfil activo</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <KeyValueGrid
              items={[
                { label: "Usuario", value: user?.email },
                { label: "Estado", value: user?.status },
                { label: "Modo storage", value: getInternalAuthStorageMode() },
                {
                  label: "Cookie segura",
                  value: isCookieBackedSession(session) ? "Sí" : "No",
                },
                {
                  label: "Expira",
                  value: formatDateTime(session?.session?.expiresAt),
                },
                { label: "Organización", value: user?.tenantId },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <Badge key={role}>{role}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
