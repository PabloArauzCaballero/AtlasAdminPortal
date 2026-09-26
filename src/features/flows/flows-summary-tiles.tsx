"use client";

import { GitBranch, ShieldAlert, ShieldOff } from "lucide-react";

import { MetricCard } from "@/shared/components/layout/metric-card";

import { type FlowsSummary } from "./types";

/**
 * Las seis cifras de cabecera del mapa de flujos.
 *
 * Salen de `flows-page.tsx` porque la pantalla seguía por encima de las 300 líneas que admite
 * `yarn max-lines` después de llevarse las columnas. Son presentación pura: reciben ya calculado
 * lo que muestran, y así la pantalla queda con lo que decide qué se pide y qué se filtra.
 */
export function FlowsSummaryTiles({
  summary,
  critical,
  broken,
  stale,
  setFilter,
}: Readonly<{
  summary: FlowsSummary | undefined;
  critical: number;
  broken: number;
  stale: number;
  setFilter: (name: string, value: string) => void;
}>) {
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label="Flujos"
        value={summary?.total ?? "—"}
        icon={GitBranch}
        hint="Una fila por operación HTTP de cada bloque"
      />
      <button
        type="button"
        className="text-left"
        onClick={() => setFilter("risk", "CRITICAL")}
      >
        <MetricCard
          label="Críticos"
          value={summary ? critical : "—"}
          tone="critical"
          hint="Escriben en identidad, crédito, dinero o borran"
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => setFilter("verification", "BROKEN")}
      >
        <MetricCard
          label="Rotos"
          value={summary ? broken : "—"}
          tone={broken ? "critical" : "success"}
          hint="Una corrida contradijo el mapa"
        />
      </button>
      <MetricCard
        label="Desactualizados"
        value={summary ? stale : "—"}
        tone={stale ? "warning" : "default"}
        hint="Cambió código desde la última verificación"
      />
      <MetricCard
        label="Escrituras públicas"
        value={summary?.publicWrites ?? "—"}
        icon={ShieldOff}
        tone={summary?.publicWrites ? "warning" : "default"}
        hint="POST/PUT/PATCH/DELETE con @Public"
      />
      <MetricCard
        label="Críticos sin test"
        value={summary?.untestedCritical ?? "—"}
        icon={ShieldAlert}
        tone={summary?.untestedCritical ? "warning" : "success"}
        hint="Riesgo HIGH o CRITICAL sin test que nombre la ruta"
      />
    </div>
  );
}
