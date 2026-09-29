"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useToolsHealth } from "@/features/systems/hooks";
import {
  ToolLiveBadge,
  toolLiveState,
} from "@/features/systems/tool-live-state";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { safeText } from "@/shared/lib/format";

/** El permiso de la pestaña Salud de Herramientas: el mismo que pedía «Salud herramientas». */
export const TOOLS_HEALTH_PERMISSION = "systems.tools.health.read";
export const TOOLS_HEALTH_HREF = "/internal/systems/tools?tab=salud";

/**
 * El aviso rojo que vivía en «Panel de control» (fusionado con Inicio el 2026-09-29): herramientas
 * CRÍTICAS que no responden, según la salud viva (`isHealthy`), la misma señal que dispara las
 * notificaciones de incidente. Quien lo monta decide si la persona tiene permiso: sin él, ni se
 * pide la salud.
 */
export function CriticalToolsBanner() {
  const health = useToolsHealth();
  const down = (health.data ?? []).filter(
    (tool) => tool.isCritical && toolLiveState(tool) === "DOWN",
  );
  if (!down.length) return null;
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div className="min-w-0">
        <p className="font-semibold">
          {down.length === 1
            ? "Hay 1 herramienta crítica caída"
            : `Hay ${down.length} herramientas críticas caídas`}
          {": "}
          {down.map((tool) => safeText(tool.name ?? tool.code)).join(", ")}.
        </p>
        <Link
          className="mt-1 inline-flex items-center gap-1 font-medium underline"
          href={TOOLS_HEALTH_HREF}
        >
          Ver la salud de las herramientas
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/** La tarjeta con el estado vivo de cada herramienta, con enlace a la pestaña Salud. */
export function CriticalToolsCard() {
  const health = useToolsHealth();
  const tools = health.data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <SectionHeader
          title="Herramientas"
          description="Si responden ahora mismo. Se actualiza sola cada 30 segundos."
          className="mb-0"
        />
        <Link
          className="shrink-0 text-sm font-medium text-atlas-accent underline"
          href={TOOLS_HEALTH_HREF}
        >
          Ver salud completa
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {health.isLoading ? <LoadingSkeleton rows={3} /> : null}
        {health.error ? (
          <p className="text-sm text-red-700">
            No se pudo leer la salud de las herramientas.
          </p>
        ) : null}
        {!tools.length && !health.isLoading && !health.error ? (
          <p className="text-sm text-atlas-muted">
            No hay herramientas con chequeo de salud.
          </p>
        ) : null}
        {tools.map((tool, index) => (
          <div
            key={`${tool.code ?? tool.name ?? index}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-atlas-border bg-[#FAFAFB] p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-atlas-text">
                {safeText(tool.name ?? tool.code)}
              </p>
              <p className="truncate text-xs text-atlas-muted">
                {safeText(tool.code)}
              </p>
            </div>
            <ToolLiveBadge tool={tool} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
