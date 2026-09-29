"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useToolsHealth } from "@/features/systems/hooks";
import { ToolsHealthTable } from "@/features/systems/tools-health-table";
import { toolLiveState } from "@/features/systems/tool-live-state";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

/**
 * La pestaña «Salud» de Herramientas (antes la pantalla «Salud herramientas», que redirige aquí).
 * Estado vivo de `/systems/health/tools`, la misma señal que dispara los avisos de servicio caído o
 * recuperado. Quien la monta comprueba `systems.tools.health.read`.
 */
export function ToolsHealthSection() {
  const health = useToolsHealth();
  const tools = health.data ?? [];
  const downTools = tools.filter((tool) => toolLiveState(tool) === "DOWN");
  const upCount = tools.filter((tool) => toolLiveState(tool) === "UP").length;
  const notApplicableCount = tools.filter(
    (tool) => toolLiveState(tool) === "NOT_APPLICABLE",
  ).length;
  const noProbeCount =
    tools.length - upCount - downTools.length - notApplicableCount;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => void health.refetch()}
          isLoading={health.isFetching}
          loadingText="Actualizando…"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>
      {health.dataUpdatedAt ? (
        <p className="animate-fade-in text-xs text-atlas-muted">
          Última actualización:{" "}
          {formatDateTime(new Date(health.dataUpdatedAt).toISOString())} ·{" "}
          {upCount} operativas · {downTools.length} caídas · {noProbeCount} sin
          chequeo en vivo · {notApplicableCount} no aplican
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
              : "No se pudo cargar la salud de las herramientas."
          }
          requestId={
            isAtlasApiError(health.error) ? health.error.requestId : undefined
          }
          onRetry={() => void health.refetch()}
        />
      ) : null}
      {health.data ? <ToolsHealthTable tools={tools} /> : null}
    </>
  );
}
