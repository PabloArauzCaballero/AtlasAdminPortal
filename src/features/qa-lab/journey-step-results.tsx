"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import type { QaJourneyRunResult, QaJourneyStepResult } from "./journey-types";

function buildStepColumns(): ColumnDef<QaJourneyStepResult>[] {
  return [
    {
      id: "order",
      header: "N.º",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="tabular-nums text-atlas-muted">{row.index + 1}</span>
      ),
    },
    {
      id: "step",
      header: "Paso",
      accessorFn: (step) => step.name,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-atlas-text">{row.original.name}</p>
          <p className="font-mono text-[0.6875rem] text-atlas-muted">
            {row.original.key}
          </p>
        </div>
      ),
    },
    {
      id: "result",
      header: "Resultado",
      accessorFn: (step) =>
        step.skipped ? "omitido" : step.passed ? "OK" : "ERROR",
      cell: ({ row }) =>
        row.original.skipped ? (
          <Badge tone="warning">omitido</Badge>
        ) : (
          <StatusBadge value={row.original.passed ? "OK" : "ERROR"} />
        ),
    },
    {
      id: "http",
      header: "HTTP",
      accessorFn: (step) => step.httpStatus ?? 0,
      cell: ({ row }) =>
        row.original.skipped || !row.original.httpStatus ? (
          <span className="text-atlas-muted">—</span>
        ) : (
          <Badge>HTTP {row.original.httpStatus}</Badge>
        ),
    },
    {
      id: "latency",
      header: "Latencia",
      accessorFn: (step) => step.latencyMs ?? -1,
      cell: ({ row }) =>
        row.original.skipped || row.original.latencyMs === undefined ? (
          <span className="text-atlas-muted">—</span>
        ) : (
          <Badge>{row.original.latencyMs} ms</Badge>
        ),
    },
    {
      id: "detail",
      header: "Detalle",
      enableSorting: false,
      cell: ({ row }) => {
        const step = row.original;
        const extracted = Object.entries(step.extracted);
        return (
          <div className="max-w-md space-y-1 text-xs">
            {step.skipped ? (
              <p className="text-amber-700">{step.skipped}</p>
            ) : null}
            {step.error ? <p className="text-red-700">{step.error}</p> : null}
            {extracted.length > 0 ? (
              <p className="break-all font-mono text-[11px] text-atlas-muted">
                extraído:{" "}
                {extracted
                  .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                  .join(", ")}
              </p>
            ) : null}
            {!step.skipped && !step.error && extracted.length === 0 ? (
              <span className="text-atlas-muted">—</span>
            ) : null}
          </div>
        );
      },
    },
  ];
}

export function JourneyStepResults({
  result,
}: Readonly<{ result: QaJourneyRunResult }>) {
  const columns = useMemo(buildStepColumns, []);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={result.failedSteps === 0 ? "OK" : "WARNING"} />
        <Badge>
          {result.passedSteps}/{result.totalSteps} pasos OK
        </Badge>
      </div>
      <DataTable
        data={result.steps}
        columns={columns}
        emptyTitle="El recorrido no ejecutó ningún paso."
        emptyDescription="Agrega pasos a la secuencia y vuelve a ejecutarla."
      />
      <JsonViewer
        title="Valores guardados al final del recorrido"
        value={result.context}
      />
      <JsonViewer title="Resultado completo" value={result} />
    </div>
  );
}
