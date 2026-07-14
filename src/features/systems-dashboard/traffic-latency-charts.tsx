"use client";

import { useMemo } from "react";
import type { TrafficLatencyRoute } from "@/features/systems/types";
import { formatNumber } from "@/shared/lib/format";

function routeLabel(route: TrafficLatencyRoute): string {
  return `${route.method} ${route.routeTemplate ?? "—"}`;
}

/**
 * Barras horizontales simples (sin dependencia de charting) para monitorear
 * cuántos hits recibe cada endpoint y su latencia. Se leen igual en claro y
 * oscuro porque usan los tokens de color del portal.
 */
export function TrafficLatencyCharts({
  routes,
}: Readonly<{ routes: TrafficLatencyRoute[] }>) {
  const topByHits = useMemo(
    () =>
      [...routes]
        .sort((a, b) => b.totalRequests - a.totalRequests)
        .slice(0, 10),
    [routes],
  );

  const topByLatency = useMemo(
    () =>
      [...routes]
        .sort((a, b) => (b.p95LatencyMs ?? 0) - (a.p95LatencyMs ?? 0))
        .slice(0, 8),
    [routes],
  );

  if (routes.length === 0) return null;

  const maxHits = Math.max(1, ...topByHits.map((r) => r.totalRequests));
  const maxLatency = Math.max(
    1,
    ...topByLatency.map((r) =>
      Math.max(r.p95LatencyMs ?? 0, r.avgLatencyMs ?? 0),
    ),
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Hits por endpoint"
        subtitle="Top 10 rutas por cantidad de requests en la ventana."
      >
        <ul className="space-y-2">
          {topByHits.map((route) => (
            <li key={routeLabel(route)}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-mono text-atlas-text">
                  {routeLabel(route)}
                </span>
                <span className="shrink-0 font-semibold text-atlas-muted">
                  {formatNumber(route.totalRequests)}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-atlas-soft">
                <div
                  className="h-full rounded-full bg-atlas-accent"
                  style={{
                    width: `${Math.max(2, (route.totalRequests / maxHits) * 100)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </ChartCard>

      <ChartCard
        title="Latencia por endpoint"
        subtitle="Top 8 rutas por p95. Barra clara = p95, barra oscura = promedio."
      >
        <ul className="space-y-3">
          {topByLatency.map((route) => {
            const avg = route.avgLatencyMs ?? 0;
            const p95 = route.p95LatencyMs ?? 0;
            return (
              <li key={routeLabel(route)}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-mono text-atlas-text">
                    {routeLabel(route)}
                  </span>
                  <span className="shrink-0 font-semibold text-atlas-muted">
                    {formatNumber(p95)} ms p95
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-atlas-soft">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-300"
                    style={{
                      width: `${Math.max(2, (p95 / maxLatency) * 100)}%`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-600"
                    style={{
                      width: `${Math.max(2, (avg / maxLatency) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: Readonly<{ title: string; subtitle: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <h4 className="text-sm font-semibold text-atlas-text">{title}</h4>
      <p className="mb-3 text-xs text-atlas-muted">{subtitle}</p>
      {children}
    </div>
  );
}
