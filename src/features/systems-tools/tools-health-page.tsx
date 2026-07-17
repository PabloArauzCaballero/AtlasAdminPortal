"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useToolsHealth } from "@/features/systems/hooks";
import {
  ToolLiveBadge,
  toolLiveState,
} from "@/features/systems/tool-live-state";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function ToolsHealthPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.tools.health.read"]}>
      <AuthorizedToolsHealthPage />
    </PermissionGate>
  );
}

function AuthorizedToolsHealthPage() {
  const health = useToolsHealth();
  const tools = health.data ?? [];
  const downTools = tools.filter((tool) => toolLiveState(tool) === "DOWN");
  const upCount = tools.filter((tool) => toolLiveState(tool) === "UP").length;
  const noProbeCount = tools.length - upCount - downTools.length;

  return (
    <>
      <PageHeader
        title="Salud de herramientas"
        description="Estado vivo reportado por `/systems/health/tools` — la misma fuente que dispara las notificaciones de servicio caído/recuperado. Se actualiza automáticamente cada 30s."
        actions={
          <Button
            onClick={() => void health.refetch()}
            isLoading={health.isFetching}
            loadingText="Actualizando…"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />
      {health.dataUpdatedAt ? (
        <p className="animate-fade-in text-xs text-atlas-muted">
          Última actualización:{" "}
          {formatDateTime(new Date(health.dataUpdatedAt).toISOString())} ·{" "}
          {upCount} operativas · {downTools.length} caídas · {noProbeCount} sin
          probe
        </p>
      ) : null}
      {downTools.length > 0 ? (
        <div className="animate-slide-up flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="min-w-0 text-sm text-red-800">
            <p className="font-semibold">
              {downTools.length === 1
                ? "Hay 1 herramienta caída"
                : `Hay ${downTools.length} herramientas caídas`}
              . Esto coincide con las notificaciones de incidentes activas.
            </p>
            <p className="mt-1 break-words text-xs text-red-700">
              {downTools
                .map((tool) => safeText(tool.name ?? tool.code))
                .join(", ")}
            </p>
          </div>
        </div>
      ) : null}
      {health.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {health.error ? (
        <ErrorState
          description={
            isAtlasApiError(health.error)
              ? health.error.message
              : "No se pudo cargar health de herramientas."
          }
          requestId={
            isAtlasApiError(health.error) ? health.error.requestId : undefined
          }
          onRetry={() => void health.refetch()}
        />
      ) : null}
      {health.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool, index) => {
            const liveState = toolLiveState(tool);
            return (
              <Card
                key={`${tool.code ?? tool.name ?? index}`}
                className={cn(
                  "animate-fade-in transition-shadow hover:shadow-md",
                  liveState === "DOWN" && "border-red-300 ring-1 ring-red-200",
                )}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {safeText(tool.name ?? tool.code)}
                      </p>
                      <p className="truncate font-mono text-xs text-atlas-muted">
                        {safeText(tool.code)}
                      </p>
                    </div>
                    <ToolLiveBadge tool={tool} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-atlas-muted">
                    <StatusBadge value={tool.status} />
                    <span>Crítica: {tool.isCritical ? "sí" : "no"}</span>
                    {tool.checkType ? (
                      <span className="font-mono">
                        {tool.checkType === "LIVE"
                          ? "probe en vivo"
                          : "solo configuración"}
                      </span>
                    ) : null}
                  </div>
                  {tool.healthMessage ? (
                    <p
                      className={cn(
                        "text-xs",
                        liveState === "DOWN"
                          ? "text-red-700"
                          : "text-atlas-muted",
                      )}
                    >
                      {safeText(tool.healthMessage)}
                    </p>
                  ) : null}
                  {Array.isArray(tool.missingEnvVars) &&
                  tool.missingEnvVars.length > 0 ? (
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-atlas-muted">
                        Variables faltantes
                      </p>
                      <p className="mt-1 break-words font-mono text-xs">
                        {tool.missingEnvVars.join(", ")}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
