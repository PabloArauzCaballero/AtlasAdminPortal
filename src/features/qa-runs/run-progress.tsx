"use client";

import { useState } from "react";
import { BadgeCheck, CircleSlash, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PersonaStepResults } from "./persona-step-results";
import { RunStepCounts } from "./run-step-counts";
import { useCancelQaRun, useQaRun } from "./run-hooks";
import {
  describeError,
  errorProps,
  finishedPersons,
  formatPassRate,
  isTerminalStatus,
  STATUS_LABEL,
  verdictView,
} from "./run-status";
import type { QaRunSummary } from "./types";

const DISTRIBUTION: Array<{
  key: keyof QaRunSummary["counters"];
  label: string;
  className: string;
}> = [
  { key: "personsPassed", label: "Pasaron", className: "bg-emerald-500" },
  { key: "personsFailed", label: "Fallaron", className: "bg-red-500" },
  { key: "personsBlocked", label: "Bloqueadas", className: "bg-amber-500" },
  {
    key: "personsIndeterminate",
    label: "Sin conclusión",
    className: "bg-slate-400",
  },
  { key: "personsCancelled", label: "Canceladas", className: "bg-slate-300" },
  { key: "personsRunning", label: "En curso", className: "bg-sky-400" },
  { key: "personsPending", label: "Pendientes", className: "bg-slate-100" },
];

/**
 * El progreso de una corrida, leído del servidor. Estado y veredicto van por separado: «Terminada»
 * sólo dice que el trabajo acabó. La causa raíz va ANTES que los conteos por paso, porque un
 * primer paso roto deja en «omitido» todos los que dependen de él y la cascada no es el problema.
 */
export function RunProgress({
  runId,
  onClose,
}: Readonly<{ runId: string; onClose?: () => void }>) {
  const run = useQaRun(runId);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancel = useCancelQaRun(runId);

  if (run.isLoading) return <LoadingSkeleton rows={3} />;
  if (run.error && !run.data) {
    return (
      <ErrorState
        title="No se pudo leer la corrida"
        {...errorProps(run.error)}
        onRetry={() => void run.refetch()}
      />
    );
  }
  if (!run.data) return null;
  const data = run.data;
  const { counters } = data;
  const terminal = isTerminalStatus(data.status);
  const verdict = verdictView(data.verdict, data.status);
  // Tras pedir la cancelación, el botón sigue en «Cancelando…» hasta que la corrida llegue a un
  // estado terminal: el servidor puede tardar un sondeo en reflejar CANCELLING.
  const cancelling =
    data.status === "CANCELLING" ||
    cancel.isPending ||
    (cancel.isSuccess && !terminal);
  const total = Math.max(counters.personsRequested, 1);

  return (
    <Card testId="qa-run-progress">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-atlas-text">
            Corrida {data.runId} · {data.templateCode} v{data.templateVersion}
          </h2>
          <p className="mt-1 text-xs text-atlas-muted">
            {data.environmentId} · datos {data.datasetMode} · escenario{" "}
            {data.scenarioCode} · semilla «{data.seed}»
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={terminal ? "default" : "info"} dot={!terminal}>
            Estado: {STATUS_LABEL[data.status] ?? data.status}
          </Badge>
          <Badge tone={verdict.tone}>Veredicto: {verdict.label}</Badge>
          {data.evidence.mockConfirmed === true ? (
            <Badge tone="success" icon={BadgeCheck}>
              Mock confirmado
            </Badge>
          ) : data.evidence.mockNamespace ? (
            <Badge tone="muted">Mock sin confirmar</Badge>
          ) : null}
          {!terminal ? (
            <Button
              variant="danger"
              className="h-8"
              disabled={cancelling}
              onClick={() => setConfirmCancel(true)}
            >
              <CircleSlash className="h-4 w-4" aria-hidden />
              {cancelling ? "Cancelando…" : "Cancelar corrida"}
            </Button>
          ) : null}
          {onClose ? (
            <Button
              variant="ghost"
              className="h-8 w-8 px-0"
              aria-label="Dejar de mirar esta corrida"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {run.error ? (
          <p className="text-xs text-amber-800">
            Se perdió la conexión al actualizar; se reintenta sola.{" "}
            {describeError(run.error).message}
          </p>
        ) : null}
        {data.errorMessage ? (
          <ErrorState
            title="La corrida no pudo completarse"
            description={data.errorMessage}
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Personas terminadas"
            value={`${finishedPersons(counters)} / ${counters.personsRequested}`}
          />
          <Metric
            label="Activas ahora"
            value={String(counters.personsRunning)}
          />
          <Metric
            label="Pasos aprobados"
            value={formatPassRate(counters.passRate)}
          />
        </div>
        <div>
          <div
            className="flex h-2.5 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label="Distribución de personas por estado"
          >
            {DISTRIBUTION.map((item) => (
              <span
                key={item.key}
                className={item.className}
                style={{
                  width: `${(Number(counters[item.key]) / total) * 100}%`,
                }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-atlas-muted">
            {DISTRIBUTION.map((item) => (
              <li key={item.key} className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${item.className}`}
                  aria-hidden
                />
                {item.label}:{" "}
                <span className="font-medium text-atlas-text">
                  {counters[item.key]}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <RootCauses run={data} />
        <RunStepCounts run={data} />
        <PersonaStepResults runId={data.runId} live={!terminal} />
      </CardContent>
      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar la corrida"
        description="Las personas que ya terminaron conservan su resultado; las que faltan no arrancan y las que están en curso se detienen."
        confirmText="Cancelar corrida"
        cancelText="Seguir ejecutando"
        isLoading={cancel.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() =>
          cancel.mutate(undefined, { onSettled: () => setConfirmCancel(false) })
        }
      />
    </Card>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-white p-3">
      <p className="text-xs text-atlas-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-atlas-text">
        {value}
      </p>
    </div>
  );
}

function RootCauses({ run }: Readonly<{ run: QaRunSummary }>) {
  if (run.rootCauses.length === 0) return null;
  const causes = [...run.rootCauses].sort((a, b) => b.personas - a.personas);
  return (
    <section aria-label="Causas raíz">
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        Causa raíz
      </h3>
      <ol className="mt-2 space-y-1.5">
        {causes.map((cause) => (
          <li
            key={`${cause.stepKey}-${cause.reason}`}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          >
            <span className="font-mono text-xs">{cause.stepKey}</span> ·{" "}
            {cause.reason}
            <span className="ml-1 text-xs text-red-700">
              ({cause.personas} persona{cause.personas === 1 ? "" : "s"})
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-atlas-muted">
        Los pasos que dependían de éstos aparecen como omitidos: son
        consecuencia, no otra falla.
      </p>
    </section>
  );
}
