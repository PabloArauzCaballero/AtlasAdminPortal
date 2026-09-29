"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge, statusTone } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useQaPersonaSteps } from "./run-hooks";
import { errorProps } from "./run-status";
import type { QaPersonaStep } from "./types";

type Attempt = QaPersonaStep["attempts"][number];
type Failure = QaPersonaStep["failures"][number];

const ATTEMPT_COLUMNS: ColumnDef<Attempt>[] = [
  { id: "attempt", header: "Intento", accessorFn: (a) => a.attempt },
  {
    id: "answer",
    header: "Respuesta",
    accessorFn: (a) => String(a.transportError ?? a.errorCode ?? a.status),
  },
  {
    id: "latency",
    header: "Latencia",
    accessorFn: (a) => a.latencyMs,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.latencyMs} ms</span>
    ),
  },
  {
    id: "lag",
    header: "Espera de turno",
    accessorFn: (a) => a.admissionLagMs,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.admissionLagMs} ms</span>
    ),
  },
  {
    id: "requestId",
    header: "Request ID",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.requestId ?? "—"}</span>
    ),
  },
];

const FAILURE_COLUMNS: ColumnDef<Failure>[] = [
  { id: "message", header: "Qué falló", accessorFn: (f) => f.message },
  {
    id: "path",
    header: "Dónde",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.path ?? "—"}</span>
    ),
  },
];

/** Los pasos de UNA persona: sus intentos y fallos se piden al abrir el paso, no antes. */
export function PersonaStepsPanel({
  runId,
  personaKey,
  onClose,
}: Readonly<{ runId: string; personaKey: string; onClose: () => void }>) {
  const steps = useQaPersonaSteps(runId, personaKey);
  const [openStep, setOpenStep] = useState<string | null>(null);
  const columns = useMemo<ColumnDef<QaPersonaStep>[]>(
    () => [
      {
        id: "step",
        header: "Paso",
        accessorFn: (step) => step.stepKey,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.stepKey}</span>
        ),
      },
      {
        id: "status",
        header: "Estado",
        accessorFn: (step) => step.status,
        cell: ({ row }) => (
          <Badge tone={statusTone(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "request",
        header: "Petición",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-atlas-muted">
            {row.original.evidence.method} {row.original.evidence.path}
          </span>
        ),
      },
      {
        id: "cause",
        header: "Causa raíz",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.rootCauseStepKey &&
            row.original.rootCauseStepKey !== row.original.stepKey
              ? row.original.rootCauseStepKey
              : "—"}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Motivo",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-red-700">
            {row.original.reason ?? "—"}
          </span>
        ),
      },
      {
        id: "attempts",
        header: "Intentos",
        enableSorting: false,
        meta: { pinRight: true },
        cell: ({ row }) => {
          const open = openStep === row.original.stepKey;
          return (
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs"
              aria-expanded={open}
              onClick={() => setOpenStep(open ? null : row.original.stepKey)}
            >
              {open
                ? "Ocultar intentos"
                : `Intentos (${row.original.attempts.length})`}
            </Button>
          );
        },
      },
    ],
    [openStep],
  );
  const selected = steps.data?.find((step) => step.stepKey === openStep);
  return (
    <section
      className="space-y-3 rounded-xl border border-atlas-border bg-atlas-soft/40 p-3"
      aria-label={`Pasos de la persona ${personaKey}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-atlas-text">
          Pasos de la persona <span className="font-mono">{personaKey}</span>
        </h3>
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      {steps.isLoading ? <LoadingSkeleton rows={2} /> : null}
      {steps.error ? (
        <ErrorState
          title="No se pudieron leer los pasos"
          {...errorProps(steps.error)}
          onRetry={() => void steps.refetch()}
        />
      ) : null}
      {steps.data ? (
        <DataTable
          data={steps.data}
          columns={columns}
          emptyTitle="Esta persona todavía no ejecutó ningún paso."
          emptyDescription="Los pasos aparecen cuando la persona empieza a recorrer el flujo."
        />
      ) : null}
      {selected ? <StepAttempts step={selected} /> : null}
    </section>
  );
}

function StepAttempts({ step }: Readonly<{ step: QaPersonaStep }>) {
  return (
    <div className="space-y-3 rounded-xl border border-atlas-border bg-white p-3">
      <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        Intentos de <span className="font-mono">{step.stepKey}</span>
      </h4>
      {step.failures.length > 0 ? (
        <DataTable data={step.failures} columns={FAILURE_COLUMNS} />
      ) : null}
      <DataTable
        data={step.attempts}
        columns={ATTEMPT_COLUMNS}
        emptyTitle="Este paso no llegó a hacer ningún intento."
        emptyDescription="Se omitió o se canceló antes de llamar al servidor."
      />
      {step.evidence.responseSummary !== undefined ? (
        <JsonViewer
          title="Resumen de la respuesta"
          value={step.evidence.responseSummary}
        />
      ) : null}
      {step.evidence.extracted ? (
        <JsonViewer
          title="Datos que tomó para los pasos siguientes"
          value={step.evidence.extracted}
        />
      ) : null}
    </div>
  );
}
