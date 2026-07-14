"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  useTrafficLatencyReport,
  useTrafficLatencyTimeseries,
} from "@/features/systems/hooks";
import type { TrafficLatencyRoute } from "@/features/systems/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { TrafficLatencyCharts } from "./traffic-latency-charts";
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

  const columns = useMemo<ColumnDef<TrafficLatencyRoute>[]>(
    () => [
      {
        header: "Método",
        accessorKey: "method",
        cell: ({ row }) => <MethodBadge method={row.original.method} />,
      },
      {
        header: "Ruta",
        accessorKey: "routeTemplate",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.routeTemplate ?? "—"}
          </span>
        ),
      },
      {
        header: "Requests",
        accessorKey: "totalRequests",
        cell: ({ row }) => formatNumber(row.original.totalRequests),
      },
      {
        header: "Latencia prom.",
        accessorKey: "avgLatencyMs",
        cell: ({ row }) => `${formatNumber(row.original.avgLatencyMs)} ms`,
      },
      {
        header: "p95",
        accessorKey: "p95LatencyMs",
        cell: ({ row }) => `${formatNumber(row.original.p95LatencyMs)} ms`,
      },
      {
        header: "Error rate",
        accessorKey: "errorRate",
        cell: ({ row }) => (
          <Badge tone={row.original.errorRate > 0.02 ? "critical" : "success"}>
            {(row.original.errorRate * 100).toFixed(1)}%
          </Badge>
        ),
      },
      {
        header: "Última vez",
        accessorKey: "lastSeenAt",
        cell: ({ row }) => formatDateTime(row.original.lastSeenAt),
      },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          title="Tráfico y latencia"
          description="Agregado de `system_action_logs` (duración real por request). Sin datos si no hay tráfico registrado en la ventana elegida."
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
            className="w-48"
            value={windowHours}
            onChange={(event) => setWindowHours(Number(event.target.value))}
          >
            {windowOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <DataTable
              data={report.data.routes}
              columns={columns}
              emptyTitle="Sin tráfico registrado en esta ventana."
              emptyDescription="Prueba con una ventana más amplia o revisa que `system_action_logs` esté recibiendo eventos."
            />
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
