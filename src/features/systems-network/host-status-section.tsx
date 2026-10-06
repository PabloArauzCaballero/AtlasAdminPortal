"use client";

import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Server,
} from "lucide-react";
import { useHostStatus } from "@/features/systems/hooks";
import type {
  HostAppState,
  HostStatusReport,
  MonitorStatus,
} from "@/features/systems/types";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Badge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";

/** El semáforo del informador, con los mismos colores que el resto de la pantalla. */
const TONE: Record<
  MonitorStatus,
  "success" | "warning" | "critical" | "default"
> = {
  ok: "success",
  warn: "warning",
  bad: "critical",
  unknown: "default",
};

const HEALTH_BADGE: Record<
  string,
  { label: string; tone: "success" | "critical" | "warning" | "muted" }
> = {
  healthy: { label: "Sana", tone: "success" },
  unhealthy: { label: "No sana", tone: "critical" },
  starting: { label: "Arrancando", tone: "warning" },
  none: { label: "Sin sonda", tone: "muted" },
  ausente: { label: "Caída", tone: "critical" },
};

const gb = (mb: number) => (mb / 1024).toFixed(1);

/**
 * «Servidor de TEST»: lo que el informador del servidor mide cada minuto y manda cada 5 (memoria, disco,
 * carga, copia de bases, cada app con su respaldo). Los umbrales son los mismos que disparan los avisos de
 * Telegram: aquí no hay una segunda opinión sobre qué es «rojo».
 */
export function HostStatusSection() {
  const host = useHostStatus();
  const report: HostStatusReport | undefined = host.data;

  return (
    <section aria-labelledby="host-status-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-atlas-muted" aria-hidden />
        <h2 id="host-status-title" className="text-sm font-semibold">
          Servidor de TEST
        </h2>
      </div>

      {host.isLoading ? <LoadingSkeleton rows={2} /> : null}
      {host.error ? (
        <ErrorState
          description={
            isAtlasApiError(host.error)
              ? host.error.message
              : "No se pudo cargar el estado del servidor."
          }
          requestId={
            isAtlasApiError(host.error) ? host.error.requestId : undefined
          }
          onRetry={() => void host.refetch()}
        />
      ) : null}

      {report && !report.available ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"
          role="status"
        >
          Sin lectura del servidor: el informador no ha mandado datos en los
          últimos 15 minutos, o todavía no está habilitado. Si debería estar
          activo, mira el bot de Telegram de avisos de TEST.
        </p>
      ) : null}

      {report?.available ? <HostBody report={report} /> : null}
    </section>
  );
}

function HostBody({
  report,
}: Readonly<{ report: Extract<HostStatusReport, { available: true }> }>) {
  const { snapshot: s, status, ageMinutes } = report;
  return (
    <>
      <p
        className={`text-xs ${status.stale ? "font-semibold text-amber-700" : "text-atlas-muted"}`}
      >
        Última lectura: {formatDateTime(s.capturedAt)} · hace {ageMinutes} min
        {status.stale
          ? " — más de 10 minutos sin datos nuevos: puede que el informador esté parado."
          : ""}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="RAM disponible"
          icon={Cpu}
          tone={TONE[status.ram]}
          value={`${gb(s.ramAvailableMb)} GB`}
          hint={`de ${gb(s.ramTotalMb)} GB · swap libre ${s.swapFreeMb} MB de ${s.swapTotalMb} MB`}
        />
        <MetricCard
          label="Disco"
          icon={HardDrive}
          tone={TONE[status.disk]}
          value={`${s.diskPct}%`}
          hint="aviso desde 85 %"
        />
        <MetricCard
          label="Carga (15 min)"
          icon={Activity}
          tone={TONE[status.load]}
          value={s.load15.toFixed(1)}
          hint={`${s.cores} núcleos · ahora ${s.load1.toFixed(1)}`}
        />
        <MetricCard
          label="Caché de build"
          icon={Layers}
          value={`${s.buildCacheGb} GB`}
          hint="se poda sola al pasar de 150 GB"
        />
        <MetricCard
          label="Copia de bases"
          icon={Database}
          tone={TONE[status.backup]}
          value={
            s.backupAgeHours === null
              ? "Sin datos"
              : `hace ${s.backupAgeHours} h`
          }
          hint="debe ser cada 6 horas"
        />
      </div>
      <HostAppsTable apps={s.apps} />
    </>
  );
}

function HostAppsTable({ apps }: Readonly<{ apps: HostAppState[] }>) {
  if (apps.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-atlas-border">
      <table className="w-full min-w-[32rem] text-left text-xs">
        <caption className="sr-only">
          Aplicaciones de Atlas en TEST, con su instancia principal y su
          respaldo
        </caption>
        <thead className="bg-atlas-soft text-atlas-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Aplicación
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Principal
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Respaldo
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Memoria
            </th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <tr key={app.name} className="border-t border-atlas-border">
              <th scope="row" className="px-3 py-2 font-medium">
                {app.name}
              </th>
              <td className="px-3 py-2">
                <HealthBadge value={app.principal} />
              </td>
              <td className="px-3 py-2">
                {app.respaldo === null ? (
                  <Badge tone="muted">Sin respaldo</Badge>
                ) : (
                  <HealthBadge value={app.respaldo} />
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {app.memoryPct === null ? "—" : `${app.memoryPct.toFixed(0)} %`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthBadge({ value }: Readonly<{ value: string }>) {
  const badge = HEALTH_BADGE[value] ?? { label: value, tone: "muted" as const };
  return <Badge tone={badge.tone}>{badge.label}</Badge>;
}
