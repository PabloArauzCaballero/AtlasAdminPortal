"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useDashboard, useToolsHealth } from "@/features/systems/hooks";
import {
  ToolLiveBadge,
  toolLiveState,
} from "@/features/systems/tool-live-state";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { formatNumber, humanizeKey, safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { TrafficLatencySection } from "./traffic-latency-section";

export function SystemsDashboardPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate
      permissions={["systems.endpoints.read", "systems.tools.health.read"]}
    >
      <AuthorizedSystemsDashboardPage />
    </PermissionGate>
  );
}

function AuthorizedSystemsDashboardPage() {
  const dashboard = useDashboard();
  const health = useToolsHealth();
  // Usa la salud viva (isHealthy), la misma señal que dispara las notificaciones
  // de incidente — el status de catálogo (ACTIVE/…) no dice si la herramienta responde.
  const criticalDown = (health.data ?? []).filter(
    (tool) => tool.isCritical && toolLiveState(tool) === "DOWN",
  );

  return (
    <>
      <PageHeader
        eyebrow="Systems Ops"
        title="Panel de control del sistema"
        description="Vista consolidada de `/systems/dashboard` y `/systems/health/tools` para monitoreo operativo en un solo lugar."
        actions={
          <Button
            onClick={() => {
              void dashboard.refetch();
              void health.refetch();
            }}
            isLoading={dashboard.isFetching || health.isFetching}
            loadingText="Actualizando…"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />
      <BusinessContextNote>
        Atlas depende de decenas de endpoints, tablas y herramientas externas
        (buró de crédito, WhatsApp, almacenamiento de archivos, etc.). Si una
        herramienta crítica falla en silencio, el negocio se entera cuando un
        cliente ya no puede hacer onboarding o una decisión de riesgo queda
        bloqueada. Este panel existe para que el equipo de plataforma detecte
        esos problemas en segundos, antes de que un cliente los sufra.
      </BusinessContextNote>
      {criticalDown.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {criticalDown.length} herramienta(s) crítica(s) reportando problemas
          de salud:{" "}
          {criticalDown.map((tool) => tool.name ?? tool.code).join(", ")}.{" "}
          <Link
            className="font-medium underline"
            href="/internal/systems/tools/health"
          >
            Ver detalle
          </Link>
        </div>
      ) : null}
      <DashboardCounts dashboard={dashboard} />
      <ToolsHealthSummary health={health} />
      <TrafficLatencySection />
    </>
  );
}

function DashboardCounts({
  dashboard,
}: Readonly<{ dashboard: ReturnType<typeof useDashboard> }>) {
  if (dashboard.isLoading) return <LoadingSkeleton rows={4} />;
  if (dashboard.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(dashboard.error)
            ? dashboard.error.message
            : "No se pudo cargar el dashboard de sistemas."
        }
        requestId={
          isAtlasApiError(dashboard.error)
            ? dashboard.error.requestId
            : undefined
        }
        onRetry={() => void dashboard.refetch()}
      />
    );
  }
  if (!dashboard.data) return null;
  const { counts, posture } = dashboard.data;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(counts ?? {}).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-atlas-muted">
                {humanizeKey(key)}
              </p>
              <p className="mt-1 text-2xl font-semibold text-atlas-text">
                {formatNumber(value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-sm font-semibold text-atlas-text">
            Postura operativa
          </p>
          <dl className="grid gap-2 sm:grid-cols-3">
            {Object.entries(posture ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-atlas-soft p-3">
                <dt className="text-xs text-atlas-muted">{humanizeKey(key)}</dt>
                <dd className="mt-0.5 text-sm font-medium text-atlas-text">
                  {safeText(value)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function ToolsHealthSummary({
  health,
}: Readonly<{ health: ReturnType<typeof useToolsHealth> }>) {
  if (health.isLoading) return <LoadingSkeleton rows={3} />;
  if (health.error || !health.data) return null;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-atlas-text">
            Herramientas monitoreadas
          </p>
          <Link
            className="text-sm font-medium text-blue-700 hover:underline"
            href="/internal/systems/tools/health"
          >
            Ver salud completa
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {health.data.map((tool, index) => (
            <div
              key={`${tool.code ?? tool.name ?? index}`}
              className="flex items-center gap-2 rounded-full border border-atlas-border px-3 py-1 text-xs"
            >
              <span className="font-medium">
                {safeText(tool.name ?? tool.code)}
              </span>
              <ToolLiveBadge tool={tool} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
