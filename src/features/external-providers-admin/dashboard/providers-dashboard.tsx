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
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { useProvidersDashboard } from "../hooks";
import type { DashboardProvider } from "../types";
import { ProviderActivityTable } from "./provider-activity-table";
import { RecentRequestsTable } from "./recent-requests-table";
import { SimulateDialog } from "./simulate-dialog";

const VENTANAS = [
  { days: 1, label: "24 horas" },
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
];

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

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-atlas-muted">
          Actividad por proveedor
        </h3>
        <ProviderActivityTable providers={providers} onSimulate={setSimular} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-atlas-muted">
          Últimas llamadas
        </h3>
        <RecentRequestsTable requests={recentRequests} />
      </div>

      {simular ? (
        <SimulateDialog provider={simular} onClose={() => setSimular(null)} />
      ) : null}
    </section>
  );
}
