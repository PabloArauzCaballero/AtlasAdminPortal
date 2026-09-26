"use client";

import { useState } from "react";
import {
  Activity,
  Ban,
  Coins,
  Gauge,
  HeartPulse,
  PhoneCall,
} from "lucide-react";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { explainStatus } from "../finding-codes";
import { useProvidersDashboard } from "../hooks";
import type { DashboardProvider, ProviderRequestRow } from "../types";
import { ProviderActivityCard } from "./provider-activity-card";
import { SimulateDialog } from "./simulate-dialog";

const VENTANAS = [
  { days: 1, label: "24 horas" },
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
];

function RecentRequests({
  requests,
}: Readonly<{ requests: ProviderRequestRow[] }>) {
  if (requests.length === 0) {
    return (
      <p className="rounded-xl border border-atlas-border bg-white p-4 text-sm text-atlas-muted shadow-subtle">
        No se llamó a ningún proveedor en este período.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-atlas-border bg-white shadow-subtle">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-atlas-border bg-atlas-soft text-xs uppercase tracking-[0.08em] text-atlas-muted">
            <th className="whitespace-nowrap px-3 py-2 text-left">Cuándo</th>
            <th className="whitespace-nowrap px-3 py-2 text-left">Proveedor</th>
            <th className="whitespace-nowrap px-3 py-2 text-left">
              Qué se pidió
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-left">Resultado</th>
            <th className="whitespace-nowrap px-3 py-2 text-right">Tardó</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const explicacion = request.responseStatus
              ? explainStatus(request.responseStatus)
              : null;
            return (
              <tr
                key={request.requestId}
                className="border-b border-atlas-border last:border-0"
              >
                <td className="whitespace-nowrap px-3 py-2 text-atlas-muted">
                  {formatDateTime(request.requestedAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  {request.providerCode ?? "—"}
                </td>
                <td className="px-3 py-2 text-atlas-muted">
                  {request.requestType ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={explicacion?.tone ?? "default"}>
                    {explicacion?.label ?? request.responseStatus ?? "—"}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {request.latencyMs === null
                    ? "—"
                    : `${formatNumber(request.latencyMs)} ms`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * El tablero que abre la pantalla de Proveedores externos.
 *
 * Va ARRIBA de la tabla y no en una pestaña aparte porque contesta las preguntas con las que se
 * entra —¿responden?, ¿cuánto tardan?, ¿cuántas llamadas hubo?, ¿cuánto costó?— y la tabla
 * contesta la siguiente, que es cómo está configurado cada uno.
 */
export function ProvidersDashboard() {
  const [days, setDays] = useState(1);
  const [simular, setSimular] = useState<DashboardProvider | null>(null);
  const dashboard = useProvidersDashboard({ days });

  if (dashboard.isLoading) return <LoadingSkeleton rows={4} />;
  if (dashboard.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(dashboard.error)
            ? dashboard.error.message
            : "No se pudo cargar la actividad de los proveedores."
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

  const { totals, providers, recentRequests, generatedAt } = dashboard.data;
  const sinMedir = totals.unmeasuredProviders;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {VENTANAS.map((ventana) => (
            <Button
              key={ventana.days}
              variant={ventana.days === days ? "primary" : "secondary"}
              onClick={() => setDays(ventana.days)}
            >
              {ventana.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-atlas-muted">
          Actualizado {formatDateTime(generatedAt)} · se refresca solo cada 30 s
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Responden"
          value={`${totals.respondingProviders} / ${totals.providers}`}
          hint={sinMedir > 0 ? `${sinMedir} sin medir todavía` : undefined}
          icon={HeartPulse}
          tone={
            totals.respondingProviders === totals.providers
              ? "success"
              : "warning"
          }
        />
        <MetricCard
          label="Llamadas"
          value={totals.totalCalls}
          icon={PhoneCall}
        />
        <MetricCard
          label="Éxito"
          value={
            totals.successRate === null
              ? "—"
              : `${formatNumber(totals.successRate)} %`
          }
          hint={
            totals.totalCalls === 0
              ? "Nadie llamó en este período"
              : `${totals.failedCalls} fallos · ${totals.blockedCalls} bloqueadas`
          }
          icon={Activity}
          tone={
            totals.successRate === null
              ? "default"
              : totals.successRate >= 95
                ? "success"
                : "warning"
          }
        />
        <MetricCard
          label="Peor latencia p95"
          value={
            totals.worstP95LatencyMs === null
              ? "—"
              : `${formatNumber(totals.worstP95LatencyMs)} ms`
          }
          icon={Gauge}
        />
        <MetricCard
          label="Costo estimado"
          value={formatNumber(totals.estimatedCost)}
          hint={
            totals.actualCost > 0
              ? `Real: ${formatNumber(totals.actualCost)}`
              : "Sin costo real registrado"
          }
          icon={Coins}
        />
      </div>

      {totals.totalCalls === 0 ? (
        <p className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-atlas-muted">
          <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Ningún proveedor recibió llamadas en este período. Las tarjetas
            siguen mostrando su salud, que se mide aparte. Para provocar una
            llamada, usa «Simular» en cualquier tarjeta.
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {providers.map((provider) => (
          <ProviderActivityCard
            key={provider.providerCode}
            provider={provider}
            onSimulate={setSimular}
          />
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-atlas-muted">
          Últimas llamadas
        </h3>
        <RecentRequests requests={recentRequests} />
      </div>

      {simular ? (
        <SimulateDialog provider={simular} onClose={() => setSimular(null)} />
      ) : null}
    </section>
  );
}
