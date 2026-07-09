import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import type { DirectRunResult, DirectStressResult } from "./types";

export function RunResultSummary({
  result,
}: Readonly<{ result: DirectRunResult }>) {
  return (
    <section className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          value={result.ok ? "OK" : result.error ? "ERROR" : "DRY_RUN"}
        />
        <Badge tone="info">{result.method}</Badge>
        {result.httpStatus ? <Badge>HTTP {result.httpStatus}</Badge> : null}
        {result.latencyMs !== undefined ? (
          <Badge>{result.latencyMs} ms</Badge>
        ) : null}
        {result.assertions ? (
          <Badge tone={result.assertions.passed ? "success" : "warning"}>
            checks {result.assertions.passedCount}/{result.assertions.total}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 break-all text-xs text-atlas-muted">{result.url}</p>
      {result.error ? (
        <p className="mt-2 text-sm font-medium text-red-700">{result.error}</p>
      ) : null}
      {result.assertions?.items.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-atlas-muted">
          {result.assertions.items.map((item) => (
            <li key={item.name} className={item.passed ? "" : "text-amber-700"}>
              {item.name}: {item.actual} / {item.expected} -{" "}
              {item.passed ? "OK" : "revisar"}
            </li>
          ))}
        </ul>
      ) : null}
      {result.warnings?.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function StressResultSummary({
  result,
}: Readonly<{ result: DirectStressResult }>) {
  return (
    <section className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={result.errorCount === 0 ? "OK" : "WARNING"} />
        <Badge tone="info">{result.method}</Badge>
        <Badge>{result.totalRequests} requests</Badge>
        <Badge>{result.throughputRps} rps</Badge>
        <Badge>p95 {result.p95LatencyMs} ms</Badge>
        <Badge tone={result.errorRate > 0 ? "warning" : "success"}>
          error {(result.errorRate * 100).toFixed(1)}%
        </Badge>
      </div>
      <p className="mt-2 break-all text-xs text-atlas-muted">{result.url}</p>
      {result.thresholds.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-atlas-muted">
          {result.thresholds.map((item) => (
            <li key={item.name}>
              {item.name}: {item.actual} / {item.expected} —{" "}
              {item.passed ? "OK" : "revisar"}
            </li>
          ))}
        </ul>
      ) : null}
      {result.warnings.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
