"use client";

import { useState } from "react";
import Link from "next/link";
import { History, Users } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { RunLaunchDialog } from "./run-launch-dialog";
import { useQaRun, useQaRuns } from "./run-hooks";
import {
  finishedPersons,
  formatPassRate,
  isTerminalStatus,
  STATUS_LABEL,
  verdictView,
} from "./run-status";

/**
 * La cabecera de ejecución del flujo seleccionado en el árbol. Lanza N personas por el flujo
 * COMPLETO: los filtros visuales del árbol recortan lo que se ve, no lo que se ejecuta (el servidor
 * usa la receta entera del flujo).
 */
export function WorkflowRunBar({
  workflowCode,
  runId,
  onRunIdChange,
}: Readonly<{
  workflowCode: string;
  runId: string | null;
  onRunIdChange: (runId: string | null) => void;
}>) {
  const [open, setOpen] = useState(false);
  const runs = useQaRuns({ limit: 20, workflowCode });
  const run = useQaRun(runId);
  const latest = runs.data?.find((item) => item.workflowCode === workflowCode);
  const current =
    run.data?.workflowCode === workflowCode ? run.data : undefined;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-atlas-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
      data-tutorial-id="workflow-run-bar"
    >
      <div className="min-w-0 text-xs text-atlas-muted">
        {current ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={isTerminalStatus(current.status) ? "default" : "info"}
              dot={!isTerminalStatus(current.status)}
            >
              {STATUS_LABEL[current.status]}
            </Badge>
            <Badge tone={verdictView(current.verdict, current.status).tone}>
              Veredicto: {verdictView(current.verdict, current.status).label}
            </Badge>
            <span>
              {finishedPersons(current.counters)} /{" "}
              {current.counters.personsRequested} personas · pasos aprobados{" "}
              {formatPassRate(current.counters.passRate)}
            </span>
            <Link
              className="font-medium text-atlas-accent underline-offset-2 hover:underline"
              href={`/internal/qa/lab?tab=journey&runId=${encodeURIComponent(current.runId)}`}
            >
              Ver detalle por persona
            </Link>
          </div>
        ) : run.data ? (
          <span>
            La corrida abierta es de otro flujo ({run.data.workflowCode}); aquí
            no se pinta.
          </span>
        ) : (
          <span>
            Cada persona recorre el flujo completo con su cuenta. Los filtros
            del árbol sólo cambian lo que ves: la corrida siempre recorre el
            flujo entero.
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          disabled={!latest || latest.runId === runId}
          onClick={() => latest && onRunIdChange(latest.runId)}
        >
          <History className="h-4 w-4" aria-hidden />
          Último resultado
        </Button>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Users className="h-4 w-4" aria-hidden />
          Ejecutar flujo con N personas
        </Button>
      </div>
      <RunLaunchDialog
        open={open}
        workflowCode={workflowCode}
        onClose={() => setOpen(false)}
        onLaunched={(id) => {
          setOpen(false);
          onRunIdChange(id);
        }}
      />
    </div>
  );
}
