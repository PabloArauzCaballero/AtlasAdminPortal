"use client";

import { useState } from "react";
import {
  useTrafficLatencyReport,
  useTrafficLatencyTimeseries,
} from "@/features/systems/hooks";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { TrafficLatencyCharts } from "./traffic-latency-charts";
import { TrafficRoutesTable } from "./traffic-routes-table";
import { TrafficLatencyTimeseriesChart } from "./traffic-latency-timeseries-chart";

const windowOptions = [
  { label: "Última hora", value: 1 },
  { label: "Últimas 24 horas", value: 24 },
  { label: "Últimos 7 días", value: 24 * 7 },
];

export function TrafficLatencySection() {
  const [windowHours, setWindowHours] = useState(24);
  const [live, setLive] = useState(true);
  const report = useTrafficLatencyReport(windowHours, { live });
  const timeseries = useTrafficLatencyTimeseries(windowHours, { live });

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          title="Tráfico y latencia"
          description="Calculado con la duración real de cada petición registrada. Sin datos si no hubo tráfico en la ventana elegida."
          className="mb-0"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-atlas-muted">
            <input
              type="checkbox"
              checked={live}
              onChange={(event) => setLive(event.target.checked)}
            />
            Auto-refresh 5s
            {live ? (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            ) : null}
          </label>
          <Select
            name="windowHours"
            className="w-48"
            ariaLabel="Ventana de tiempo del gráfico"
            value={String(windowHours)}
            onChange={(valor) => setWindowHours(Number(valor))}
            options={windowOptions.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.isLoading ? <LoadingSkeleton rows={4} /> : null}
        {report.error ? (
          <ErrorState
            description={
              isAtlasApiError(report.error)
                ? report.error.message
                : "No se pudo cargar el reporte de tráfico y latencia."
            }
            requestId={
              isAtlasApiError(report.error) ? report.error.requestId : undefined
            }
            onRetry={() => void report.refetch()}
          />
        ) : null}
        {report.data ? (
          <>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryTile
                label="Requests"
                value={formatNumber(report.data.summary.totalRequests)}
              />
              <SummaryTile
                label="Latencia prom."
                value={`${formatNumber(report.data.summary.avgLatencyMs)} ms`}
              />
              <SummaryTile
                label="p95 max"
                value={`${formatNumber(report.data.summary.p95LatencyMs)} ms`}
              />
              <SummaryTile
                label="Error rate"
                value={`${(report.data.summary.errorRate * 100).toFixed(1)}%`}
              />
            </div>
            {timeseries.data ? (
              <TrafficLatencyTimeseriesChart
                buckets={timeseries.data.buckets}
              />
            ) : null}
            <TrafficLatencyCharts routes={report.data.routes} />
            <TrafficRoutesTable windowHours={windowHours} live={live} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryTile({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-atlas-border bg-atlas-soft p-3">
      <p className="text-xs text-atlas-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-atlas-text">{value}</p>
    </div>
  );
}
