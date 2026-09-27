"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Button } from "@/shared/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import { describeRunEvent } from "./run-events";
import { useQaRunEvents, useQaRunEvidence } from "./run-hooks";
import { errorProps, verdictView } from "./run-status";
import type { QaRunStatus } from "./types";

/** Sección plegada: el contenido (y su petición) sólo existe mientras está abierta. */
function Collapsible({
  title,
  hint,
  children,
}: Readonly<{
  title: string;
  hint: string;
  children: (open: boolean) => ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-atlas-border">
      <Button
        variant="ghost"
        className="h-auto w-full justify-start gap-2 rounded-xl px-3 py-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden />
        )}
        <span className="flex flex-col items-start">
          <span>{title}</span>
          <span className="whitespace-normal text-xs font-normal text-atlas-muted">
            {hint}
          </span>
        </span>
      </Button>
      {open ? <div className="px-3 pb-3">{children(open)}</div> : null}
    </section>
  );
}

/**
 * El diario de la corrida: cada hito que el worker registró (en cola, iniciada, cada persona que
 * terminó, cerrada). Mientras la corrida sigue viva se sondea cada 3 s pidiendo sólo lo nuevo.
 */
export function RunEventsPanel({
  runId,
  live,
}: Readonly<{ runId: string; live: boolean }>) {
  return (
    <Collapsible
      title="Diario de la corrida"
      hint="Cada hito que registró el servidor, en orden. Útil para ver en qué momento se torció algo."
    >
      {(open) => <RunEventsList runId={runId} live={live} enabled={open} />}
    </Collapsible>
  );
}

function RunEventsList({
  runId,
  live,
  enabled,
}: Readonly<{ runId: string; live: boolean; enabled: boolean }>) {
  const events = useQaRunEvents(runId, { live, enabled });
  const { refetch } = events;
  // Al terminar la corrida se deja de sondear; una última lectura recoge el evento de cierre.
  useEffect(() => {
    if (!live && enabled) void refetch();
  }, [live, enabled, refetch]);

  if (events.isLoading) return <LoadingSkeleton rows={3} />;
  if (events.error && !events.data)
    return (
      <ErrorState
        title="No se pudo leer el diario"
        {...errorProps(events.error)}
        onRetry={() => void events.refetch()}
      />
    );
  const items = events.data?.items ?? [];
  if (items.length === 0)
    return (
      <EmptyState
        title="Sin eventos todavía"
        description="La corrida aún no registró ningún hito. Si está en cola, aparecerán al arrancar."
      />
    );
  return (
    <ol className="space-y-1 text-sm" aria-live={live ? "polite" : undefined}>
      {items.map((event) => {
        const view = describeRunEvent(event);
        return (
          <li
            key={event.sequence}
            className="flex flex-wrap items-baseline gap-x-2 border-b border-atlas-border/60 py-1 last:border-0"
          >
            <span className="font-mono text-xs tabular-nums text-atlas-muted">
              #{event.sequence} · {formatDateTime(event.createdAt)}
            </span>
            <span className="font-medium text-atlas-text">{view.label}</span>
            {view.detail ? (
              <span className="text-xs text-atlas-muted">{view.detail}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * El manifiesto de evidencia: huellas del plan y de la receta, semilla, espacio del simulador y
 * veredicto. Es lo que permite repetir una corrida idéntica o demostrar qué se probó.
 */
export function RunEvidencePanel({
  runId,
  status,
}: Readonly<{ runId: string; status: QaRunStatus }>) {
  return (
    <Collapsible
      title="Evidencia de la corrida"
      hint="Huellas, semilla y veredicto: lo necesario para repetirla igual o justificar el resultado."
    >
      {(open) => (
        <RunEvidenceBody runId={runId} status={status} enabled={open} />
      )}
    </Collapsible>
  );
}

function RunEvidenceBody({
  runId,
  status,
  enabled,
}: Readonly<{ runId: string; status: QaRunStatus; enabled: boolean }>) {
  const evidence = useQaRunEvidence(runId, enabled);
  if (evidence.isLoading) return <LoadingSkeleton rows={3} />;
  if (evidence.error)
    return (
      <ErrorState
        title="No se pudo leer la evidencia"
        {...errorProps(evidence.error)}
        onRetry={() => void evidence.refetch()}
      />
    );
  if (!evidence.data) return null;
  const data = evidence.data;
  const verdict = verdictView(data.verdict, status);
  const extra = data.evidence && Object.keys(data.evidence).length > 0;
  return (
    <div className="space-y-3">
      <KeyValueGrid
        items={[
          {
            label: "Veredicto",
            value: verdict.label,
            // «info» no existe en la rejilla: una corrida viva todavía no tiene veredicto que pintar.
            tone: verdict.tone === "info" ? "muted" : verdict.tone,
          },
          { label: "Huella del plan", value: data.planHash, mono: true },
          { label: "Huella de la receta", value: data.recipeHash, mono: true },
          { label: "Semilla", value: data.seed, mono: true },
          { label: "Espacio del simulador", value: data.namespace, mono: true },
          { label: "Fecha de referencia", value: data.referenceDate },
          { label: "Versión del generador", value: data.generatorVersion },
        ]}
      />
      {extra ? (
        <details className="rounded-lg border border-atlas-border bg-atlas-soft p-2 text-xs">
          <summary className="cursor-pointer font-medium text-atlas-text">
            Detalle técnico del cierre
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono">
            {JSON.stringify(data.evidence, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
