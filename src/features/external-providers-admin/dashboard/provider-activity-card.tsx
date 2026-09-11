"use client";

import { Activity, Play } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { ProviderHealthBadge, ProviderModeBadge } from "../provider-badges";
import type { DashboardProvider } from "../types";
import { HealthSparkline } from "./health-sparkline";

/**
 * La latencia sólo se puede afirmar cuando alguien la midió.
 *
 * Hoy el único modo que sale a la red es `mock_server`: en los demás —incluidos `sandbox` y
 * `production`, cuyos adaptadores no tienen integración real todavía— `checkMockHealth` devuelve
 * `UP` con `0 ms` sin llamar a nadie, y pintar «Responde · 0 ms» afirma una comprobación que no
 * ocurrió.
 *
 * Por eso la condición mira el RESULTADO y no sólo el modo: en cuanto `production` mida de verdad,
 * su latencia dejará de ser cero y esto se vuelve cierto solo, sin que nadie recuerde tocarlo.
 */
export function isMeasured(mode: string, latencyMs?: number | null): boolean {
  if (typeof latencyMs === "number" && latencyMs > 0) return true;
  return mode === "mock_server";
}

function toneForHealth(
  provider: DashboardProvider,
): "success" | "warning" | "critical" | "muted" {
  if (!provider.health || !isMeasured(provider.mode)) return "muted";
  if (provider.health.status === "UP") return "success";
  if (provider.health.status === "DEGRADED") return "warning";
  return "critical";
}

function Row({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-atlas-muted">{label}</span>
      <span className="font-medium tabular-nums text-atlas-text">{value}</span>
    </div>
  );
}

/**
 * Una tarjeta por proveedor: cómo se le llama, si responde, cuánto tardó y qué pasó con las
 * llamadas del período.
 *
 * El orden de las líneas es deliberado: primero cuántas llamadas hubo, porque si no hubo ninguna
 * el resto de las cifras no significan nada, y una tasa de éxito sobre cero llamadas leída como
 * «0 %» es la forma más rápida de dar por caído a un proveedor que nadie usó.
 */
export function ProviderActivityCard({
  provider,
  onSimulate,
}: Readonly<{
  provider: DashboardProvider;
  onSimulate: (provider: DashboardProvider) => void;
}>) {
  const { activity } = provider;
  const measured = isMeasured(provider.mode, provider.health?.latencyMs);
  const sinLlamadas = activity.total === 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-atlas-text">
            {provider.providerCode}
          </p>
          <p className="truncate text-xs text-atlas-muted">
            {provider.name ?? "—"}
          </p>
        </div>
        <span className="shrink-0">
          {measured ? (
            <ProviderHealthBadge value={provider.health?.status} />
          ) : (
            <Badge tone="muted">Sin llamada</Badge>
          )}
        </span>
      </div>

      <HealthSparkline
        points={measured ? provider.healthSeries : []}
        tone={toneForHealth(provider)}
      />

      <div className="flex flex-col gap-1">
        <Row label="Llamadas" value={formatNumber(activity.total)} />
        <Row
          label="Éxito"
          value={
            activity.successRate === null
              ? "—"
              : `${formatNumber(activity.successRate)} %`
          }
        />
        <Row
          label="Latencia p95"
          value={
            activity.p95LatencyMs === null
              ? "—"
              : `${formatNumber(activity.p95LatencyMs)} ms`
          }
        />
        <Row
          label={sinLlamadas ? "Último chequeo" : "Última llamada"}
          value={
            sinLlamadas
              ? provider.health
                ? formatDateTime(provider.health.checkedAt)
                : "—"
              : formatDateTime(activity.lastRequestAt)
          }
        />
      </div>

      {activity.lastErrorStatus ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
          Último error: {activity.lastErrorMessage ?? activity.lastErrorStatus}
        </p>
      ) : null}

      {/* `mt-auto` alinea el pie de todas las tarjetas de la fila aunque su contenido difiera:
          una sin error y otra con él tenían el botón a distinta altura. */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-atlas-border pt-3">
        {/* La insignia parte en dos líneas si la comprime el botón de al lado: `min-w-0` la deja
            encogerse y `shrink-0` protege al botón, que es el que nunca debe partirse. */}
        <span className="min-w-0 [&_span]:whitespace-nowrap">
          <ProviderModeBadge value={provider.mode} />
        </span>
        <Button
          variant="ghost"
          className="shrink-0"
          onClick={() => onSimulate(provider)}
        >
          {measured ? (
            <Play className="h-4 w-4" aria-hidden />
          ) : (
            <Activity className="h-4 w-4" aria-hidden />
          )}
          Simular
        </Button>
      </div>
    </div>
  );
}
