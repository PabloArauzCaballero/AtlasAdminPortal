import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import type { QaJourneyRunResult } from "./journey-types";

export function JourneyStepResults({
  result,
}: Readonly<{ result: QaJourneyRunResult }>) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={result.failedSteps === 0 ? "OK" : "WARNING"} />
        <Badge>
          {result.passedSteps}/{result.totalSteps} pasos OK
        </Badge>
      </div>
      <ol className="space-y-2">
        {result.steps.map((step, index) => (
          <li
            key={step.key}
            className="rounded-xl border border-atlas-border bg-white p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="default">
                {index + 1}. {step.name}
              </Badge>
              {step.skipped ? (
                <Badge tone="warning">omitido</Badge>
              ) : (
                <>
                  <StatusBadge value={step.passed ? "OK" : "ERROR"} />
                  {step.httpStatus ? (
                    <Badge>HTTP {step.httpStatus}</Badge>
                  ) : null}
                  {step.latencyMs !== undefined ? (
                    <Badge>{step.latencyMs} ms</Badge>
                  ) : null}
                </>
              )}
            </div>
            {step.skipped ? (
              <p className="mt-1 text-xs text-amber-700">{step.skipped}</p>
            ) : null}
            {step.error ? (
              <p className="mt-1 text-xs text-red-700">{step.error}</p>
            ) : null}
            {Object.keys(step.extracted).length > 0 ? (
              <p className="mt-1 break-all font-mono text-[11px] text-atlas-muted">
                extraído:{" "}
                {Object.entries(step.extracted)
                  .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                  .join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      <JsonViewer title="Contexto final del journey" value={result.context} />
      <JsonViewer title="Resultado completo" value={result} />
    </div>
  );
}
