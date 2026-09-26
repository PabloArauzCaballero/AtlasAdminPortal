"use client";

import Link from "next/link";
import type { useTestRun } from "@/features/systems/hooks";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";

/** Respuesta inmediata del backend al encolar una corrida de suite. */
export function SubmittedRun({
  result,
}: Readonly<{ result: { runId?: string; status?: string } & object }>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-atlas-soft p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={result.status ?? "SUBMITTED"} />
        {result.runId ? (
          <Link
            className="text-sm font-medium text-blue-700 underline"
            href={`/internal/qa/runs/${result.runId}`}
          >
            Ver ejecucion #{result.runId}
          </Link>
        ) : null}
      </div>
      <div className="mt-3">
        <JsonViewer title="Respuesta del backend" value={result} />
      </div>
    </div>
  );
}

/** Estado en vivo de la corrida mientras el backend la procesa. */
export function LiveRunStatus({
  run,
}: Readonly<{ run: ReturnType<typeof useTestRun> }>) {
  if (run.isLoading) return <LoadingSkeleton rows={2} />;
  if (!run.data) return null;
  return (
    <div className="space-y-3 rounded-xl border border-atlas-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-atlas-text">
          Estado actual
        </span>
        <StatusBadge value={run.data.run.status} />
      </div>
      <KeyValueGrid
        items={[
          { label: "Run", value: `#${run.data.run.runId}`, mono: true },
          { label: "Ambiente", value: run.data.run.environment },
          {
            label: "Duracion",
            value: `${formatNumber(run.data.run.durationMs)} ms`,
          },
          { label: "Inicio", value: formatDateTime(run.data.run.startedAt) },
          { label: "Fin", value: formatDateTime(run.data.run.finishedAt) },
        ]}
      />
    </div>
  );
}
