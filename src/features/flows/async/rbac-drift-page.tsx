"use client";

import { ShieldAlert } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useRbacDrift } from "./hooks";
import { DRIFT } from "./labels";
import type { RbacDriftResponse } from "./types";

/**
 * Pantallas cuyo menú pide un permiso que la API no aplica, medido sobre las llamadas que DE VERDAD
 * salieron de cada pantalla. Sin uso real no hay nada que medir, y la vista lo dice en vez de
 * enseñar una lista vacía que se leería como «no hay deriva».
 */
export function RbacDriftPage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedRbacDriftPage />
    </PermissionGate>
  );
}

export function contarSinGuarda(data: RbacDriftResponse | undefined): number {
  return (data?.screens ?? []).reduce(
    (n, pantalla) =>
      n +
      pantalla.calls.filter((call) => call.severity === "SIN_GUARDA").length,
    0,
  );
}

function AuthorizedRbacDriftPage() {
  const query = useRbacDrift();
  const data = query.data;
  const sinGuarda = contarSinGuarda(data);

  return (
    <>
      <PageHeader
        icon={ShieldAlert}
        eyebrow="Systems Ops · Flujos"
        title="Deriva de permisos"
        description="Pantallas cuyo menú exige un permiso que la API no aplica en las llamadas que se hicieron desde ellas. Sólo «Sin guarda» es una avería; «Sólo rol» y «Pública» son otra conversación."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Pantallas con llamadas observadas"
          value={data?.screensWithObservedEdges ?? "—"}
          icon={ShieldAlert}
          hint="Últimos 30 días, por la pantalla que declara cada llamada"
        />
        <MetricCard
          label="Pantallas con deriva"
          value={data?.screens.length ?? "—"}
        />
        <MetricCard
          label="Llamadas sin guarda"
          value={data ? sinGuarda : "—"}
          tone={sinGuarda ? "warning" : "success"}
        />
      </div>
      {data?.truncated ? (
        <p className="mb-4 text-xs text-amber-700">
          La consulta de llamadas vino cortada: esto opina sobre datos
          incompletos.
        </p>
      ) : null}
      {query.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo cargar la deriva de permisos."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {data && data.screensWithObservedEdges === 0 ? (
        <EmptyState
          title="Aún no hay llamadas atribuidas a pantallas"
          description="La deriva se mide sobre lo que las pantallas llamaron de verdad. Sin uso real, una lista vacía no significa que no haya deriva."
        />
      ) : null}
      {data && data.screensWithObservedEdges > 0 && !data.screens.length ? (
        <EmptyState
          title="Sin deriva en lo observado"
          description="Todas las llamadas observadas desde pantallas con permiso de menú exigen ese permiso en la API."
        />
      ) : null}
      <div className="space-y-4">
        {data?.screens.map((pantalla) => (
          <Card key={`${pantalla.clientCode} ${pantalla.route}`}>
            <CardHeader>
              <p className="font-mono text-sm">{pantalla.route}</p>
              <p className="text-xs text-atlas-muted">
                {pantalla.clientCode} · el menú pide{" "}
                {[...pantalla.navPermissions, ...pantalla.navRoles].join(", ")}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {pantalla.calls.map((call) => (
                <div
                  key={call.flowId}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <span title={DRIFT[call.severity].hint}>
                    <Badge tone={DRIFT[call.severity].tone} dot>
                      {DRIFT[call.severity].label}
                    </Badge>
                  </span>
                  <MethodBadge method={call.method} />
                  <span className="font-mono">{call.path}</span>
                  {call.roles.length ? (
                    <span className="text-atlas-muted">
                      roles: {call.roles.join(", ")}
                    </span>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
