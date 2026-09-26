"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Square, Users } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { StressLatencyChart } from "@/features/qa-lab/latency-chart";
import type { StressLatencyPoint } from "@/features/qa-lab/types";
import {
  useCancelQaRun,
  useLaunchQaRun,
  useQaCapabilities,
  useQaPreflight,
  useQaRun,
  useQaRunTimeline,
  useQaRuns,
  useQaTemplates,
} from "./run-hooks";
import { newLoadSeed, planQuickLaunch } from "./quick-launch";
import {
  BLOCKER_HINT,
  errorProps,
  finishedPersons,
  formatPassRate,
  isTerminalStatus,
  STATUS_LABEL,
  verdictView,
} from "./run-status";
import type { QaRunTimeline } from "./timeline-types";

const DEFAULT_USERS = 10;

/**
 * La prueba de carga del flujo, desde el árbol: cuántos usuarios ficticios, «Generar y cargar»,
 * «Terminar prueba» y su gráfico de latencia y carga. Nada más.
 *
 * «Generar y cargar» hace en un solo clic lo que antes eran dos botones y siete campos: valida la
 * preparación en el servidor y, si está lista, lanza el plan validado. Si el servidor la bloquea,
 * se dice por qué con su código, sin lanzar nada.
 */
export function WorkflowLoadBar({
  workflowCode,
  runId,
  onRunIdChange,
}: Readonly<{
  workflowCode: string;
  runId: string | null;
  onRunIdChange: (runId: string | null) => void;
}>) {
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [problem, setProblem] = useState<string | null>(null);
  const capabilities = useQaCapabilities();
  const templates = useQaTemplates(workflowCode);
  const preflight = useQaPreflight();
  const launch = useLaunchQaRun();
  const run = useQaRun(runId);
  const current =
    run.data?.workflowCode === workflowCode ? run.data : undefined;
  const live = Boolean(current && !isTerminalStatus(current.status));
  const cancel = useCancelQaRun(current?.runId);
  const timeline = useQaRunTimeline(current?.runId, live);
  const environment = capabilities.data?.environments[0];
  // Al volver a la pantalla se ve la última prueba de este flujo, sin tener que buscarla.
  const recent = useQaRuns({ limit: 5, workflowCode });
  const latestId = recent.data?.find(
    (item) => item.workflowCode === workflowCode,
  )?.runId;
  useEffect(() => {
    if (!runId && latestId) onRunIdChange(latestId);
  }, [runId, latestId, onRunIdChange]);
  const starting = preflight.isPending || launch.isPending;

  async function generateAndLoad() {
    setProblem(null);
    preflight.reset();
    launch.reset();
    if (!capabilities.data || !templates.data) {
      setProblem("Todavía se está leyendo la configuración de QA; reintenta.");
      return;
    }
    const plan = planQuickLaunch({
      workflowCode,
      persons: users,
      capabilities: capabilities.data,
      templates: templates.data,
      seed: newLoadSeed(),
    });
    if (!plan.ok) {
      setProblem(plan.problem);
      return;
    }
    try {
      const checked = await preflight.mutateAsync(plan.request);
      if (checked.status !== "READY" || !checked.planId || !checked.planHash) {
        setProblem(
          checked.blockers
            .map(
              (blocker) =>
                `${blocker.message}${BLOCKER_HINT[blocker.code] ? ` — ${BLOCKER_HINT[blocker.code]}` : ""}`,
            )
            .join(" · ") || "El servidor bloqueó la preparación sin motivo.",
        );
        return;
      }
      const launched = await launch.mutateAsync({
        planId: checked.planId,
        planHash: checked.planHash,
      });
      onRunIdChange(launched.runId);
    } catch {
      // El error de la mutación se pinta abajo con su mensaje y su requestId.
    }
  }

  const failure = preflight.error ?? launch.error ?? cancel.error;

  return (
    <section
      className="space-y-3 rounded-xl border border-atlas-border bg-white p-3"
      data-tutorial-id="workflow-run-bar"
      aria-label="Prueba de carga con usuarios ficticios"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-48">
          <Field
            label="Usuarios ficticios"
            tooltip="Cuántas personas inventadas recorren el flujo completo, cada una con su cuenta, sus datos y las fotos de su carnet generadas por el mock."
            hint={environment ? `Hasta ${environment.maxPersons}.` : undefined}
          >
            <Input
              type="number"
              min={1}
              max={environment?.maxPersons}
              value={Number.isNaN(users) ? "" : users}
              disabled={live || starting}
              onChange={(event) => setUsers(event.target.valueAsNumber)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={live || capabilities.isLoading || templates.isLoading}
            isLoading={starting}
            loadingText="Generando…"
            onClick={() => void generateAndLoad()}
          >
            <Play className="h-4 w-4" aria-hidden />
            Generar y cargar
          </Button>
          <Button
            variant="danger"
            disabled={!live || current?.status === "CANCELLING"}
            isLoading={cancel.isPending}
            loadingText="Terminando…"
            onClick={() => cancel.mutate()}
          >
            <Square className="h-4 w-4" aria-hidden />
            Terminar prueba
          </Button>
        </div>
      </div>

      {problem ? (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900"
        >
          {problem}
        </p>
      ) : null}
      {failure ? (
        <ErrorState
          title="No se pudo completar la acción"
          {...errorProps(failure)}
        />
      ) : null}

      {current ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-atlas-muted">
            <Badge tone={live ? "info" : "default"} dot={live}>
              {STATUS_LABEL[current.status]}
            </Badge>
            <Badge tone={verdictView(current.verdict, current.status).tone}>
              {verdictView(current.verdict, current.status).label}
            </Badge>
            <span>
              <Users className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {finishedPersons(current.counters)} de{" "}
              {current.counters.personsRequested} usuarios terminaron ·{" "}
              {current.counters.personsPassed} llegaron al final · pasos bien{" "}
              {formatPassRate(current.counters.passRate)} ·{" "}
              {current.counters.requestsIssued} peticiones
            </span>
            <Link
              className="font-medium text-atlas-accent underline-offset-2 hover:underline"
              href={`/internal/qa/lab?tab=journey&runId=${encodeURIComponent(current.runId)}`}
            >
              Ver cada usuario
            </Link>
          </div>
          {current.rootCauses.length > 0 ? (
            <p className="text-xs text-red-700">
              Donde más fallan:{" "}
              {current.rootCauses
                .slice(0, 3)
                .map(
                  (cause) =>
                    `${cause.stepKey} (${cause.personas}): ${cause.reason ?? "sin motivo"}`,
                )
                .join(" · ")}
            </p>
          ) : null}
          <StressLatencyChart
            title="Latencia y carga de la prueba"
            caption={chartCaption(timeline.data)}
            emptyText={
              timeline.error
                ? "El servidor todavía no publica la línea de tiempo de esta prueba."
                : "Aún no terminó ninguna petición."
            }
            secondLabel={(second) => `+${second} s`}
            dashedLabel="mediana (p50)"
            points={toPoints(timeline.data)}
          />
        </>
      ) : null}
    </section>
  );
}

function chartCaption(timeline?: QaRunTimeline): string {
  if (!timeline) return "Peticiones terminadas por tramo y su latencia.";
  const { totals, bucketSeconds } = timeline;
  const parts = [
    `Tramos de ${bucketSeconds} s`,
    `${totals.requests} peticiones`,
    `${totals.errors} con error`,
  ];
  if (totals.p95Ms !== null) parts.push(`p95 ${Math.round(totals.p95Ms)} ms`);
  if (totals.rps !== null) parts.push(`${totals.rps.toFixed(1)} peticiones/s`);
  return parts.join(" · ");
}

/** Los tramos del servidor, en el formato del gráfico de carga (segundo desde el inicio). */
export function toPoints(timeline?: QaRunTimeline): StressLatencyPoint[] {
  if (!timeline || timeline.buckets.length === 0) return [];
  const origin = Date.parse(timeline.startedAt ?? timeline.buckets[0].t);
  return timeline.buckets.map((bucket) => ({
    second: Math.max(0, Math.round((Date.parse(bucket.t) - origin) / 1000)),
    count: bucket.requests,
    errorCount: bucket.errors,
    avgLatencyMs: bucket.p50Ms ?? 0,
    p50LatencyMs: bucket.p50Ms ?? 0,
    p95LatencyMs: bucket.p95Ms ?? 0,
    maxLatencyMs: bucket.maxMs ?? 0,
  }));
}
