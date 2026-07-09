"use client";

import { ShieldCheck } from "lucide-react";
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
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import { buildSessionChecks } from "./session-checks";

export function SessionSecurityPage() {
  const { session, user, permissions, roles } = useAuth();
  const checks = useMemo(() => buildSessionChecks(session), [session]);
  const blocked = checks.filter((check) => check.status === "blocked").length;
  const warnings = checks.filter((check) => check.status === "warning").length;

  return (
    <PermissionGate permissions={[]}>
      <PageHeader
        eyebrow="Fase 10"
        title="Seguridad de sesión"
        description="Revisión operativa de autenticación interna, cookies, MFA y permisos efectivos antes de producción."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Permisos" value={permissions.length} />
        <MetricCard label="Roles" value={roles.length} />
        <MetricCard label="Alertas" value={warnings} />
        <MetricCard label="Bloqueos" value={blocked} />
      </section>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-atlas-muted" />
              <h2 className="text-sm font-semibold">Checks de producción</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.key}
                className="rounded-lg border border-atlas-border p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-atlas-text">
                    {check.label}
                  </p>
                  <StatusBadge value={check.status.toUpperCase()} />
                </div>
                <p className="mt-1 text-sm text-atlas-muted">
                  {check.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
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
                { label: "Tenant", value: user?.tenantId },
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
