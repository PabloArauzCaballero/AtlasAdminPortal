"use client";

import { MetricCard } from "@/shared/components/layout/metric-card";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import {
  buildSessionSignals,
  countActiveSignals,
  countDeniedPermissions,
  countFailedAuthEvents,
} from "./session-signals";
import type { SessionInvestigationSummary } from "./types";

function SignalBadge({
  label,
  active,
  hint,
}: Readonly<{ label: string; active: boolean | null; hint: string }>) {
  const tone =
    active === true ? "critical" : active === false ? "success" : "muted";
  const text =
    active === true ? "Detectado" : active === false ? "Limpio" : "Sin datos";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-atlas-border bg-white px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-atlas-text">
          {label}
        </span>
        <span className="block text-xs text-atlas-muted">{hint}</span>
      </span>
      <Badge tone={tone} dot>
        {text}
      </Badge>
    </div>
  );
}

export function SessionSignalsSection({
  summary,
}: Readonly<{ summary: SessionInvestigationSummary }>) {
  const signals = buildSessionSignals(summary);
  const activeCount = countActiveSignals(signals);
  const failedAuth = countFailedAuthEvents(summary);
  const deniedPermissions = countDeniedPermissions(summary);

  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Señales encendidas"
          value={activeCount}
          hint={`de ${signals.length} evaluadas`}
        />
        <MetricCard
          label="Riesgo del dispositivo"
          value={summary.device?.riskStatus ?? "—"}
          hint={
            summary.device
              ? undefined
              : "La sesión no tiene dispositivo asociado"
          }
        />
        <MetricCard
          label="Autenticaciones fallidas"
          value={failedAuth}
          hint={`de ${summary.authEvents.length} eventos`}
        />
        <MetricCard
          label="Permisos denegados"
          value={deniedPermissions}
          hint={`de ${summary.permissions.length} solicitados`}
        />
      </div>
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-atlas-text">
            Señales de fraude
          </h2>
          <p className="mt-1 text-sm text-atlas-muted">
            Banderas agregadas desde la reputación de IP y los snapshots del
            dispositivo. &quot;Sin datos&quot; significa que no hubo telemetría
            — no que la señal esté limpia.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {signals.map((signal) => (
              <SignalBadge
                key={signal.label}
                label={signal.label}
                active={signal.active}
                hint={signal.hint}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
