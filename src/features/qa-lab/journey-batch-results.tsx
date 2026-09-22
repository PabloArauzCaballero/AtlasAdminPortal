import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { JourneyStepResults } from "./journey-step-results";
import type { QaJourneyBatchResult } from "./journey-types";

/**
 * Resultado de un lote de journeys (`iterations` > 1). Con una sola corrida se ve exactamente
 * igual que antes (`JourneyStepResults` a secas, sin el cascarón del lote): el volumen no cambia
 * la lectura de un journey suelto.
 */
export function JourneyBatchResults({
  batch,
}: Readonly<{ batch: QaJourneyBatchResult }>) {
  if (batch.iterations === 1 && batch.runs[0]) {
    return <JourneyStepResults result={batch.runs[0].result} />;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={batch.failedIterations === 0 ? "OK" : "WARNING"} />
        <Badge>
          {batch.passedIterations}/{batch.iterations} personas OK
        </Badge>
        <Badge tone="default">semilla: {batch.seed}</Badge>
        <Badge tone="default">concurrencia: {batch.concurrency}</Badge>
      </div>
      <ol className="space-y-2">
        {batch.runs.map((run) => (
          <IterationRow key={run.index} run={run} />
        ))}
      </ol>
    </div>
  );
}

function IterationRow({
  run,
}: Readonly<{ run: QaJourneyBatchResult["runs"][number] }>) {
  const [open, setOpen] = useState(false);
  const failed = run.result.failedSteps > 0;
  return (
    <li className="rounded-xl border border-atlas-border bg-white p-3">
      <button
        type="button"
        className="flex w-full flex-wrap items-center gap-2 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-atlas-muted"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-atlas-muted"
            aria-hidden
          />
        )}
        <Badge tone="default">Persona {run.index + 1}</Badge>
        <StatusBadge value={failed ? "ERROR" : "OK"} />
        <Badge>
          {run.result.passedSteps}/{run.result.totalSteps} pasos
        </Badge>
        {typeof run.persona.documentNumber === "string" ? (
          <span className="font-mono text-[11px] text-atlas-muted">
            doc: {run.persona.documentNumber}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="mt-3">
          <JourneyStepResults result={run.result} />
          <JsonViewer title="Persona simulada" value={run.persona} />
        </div>
      ) : null}
    </li>
  );
}
