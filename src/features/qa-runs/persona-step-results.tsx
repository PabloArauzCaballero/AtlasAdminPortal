"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Pagination } from "@/shared/components/data-table/pagination";
import { Badge, statusTone } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Select } from "@/shared/components/ui/input";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import type { Option } from "@/shared/lib/options";
import { useQaPersonaSteps, useQaRunPersonas } from "./run-hooks";
import { errorProps } from "./run-status";
import type { QaPersonaStep } from "./types";

const PAGE_SIZE = 25;

const STATUS_FILTER: Option[] = [
  {
    value: "ALL",
    label: "Todas",
    description: "Todas las personas de la corrida, en orden de llegada.",
  },
  {
    value: "FAILED",
    label: "Fallaron",
    description: "Personas con al menos un paso que no cumplió lo esperado.",
  },
  {
    value: "BLOCKED",
    label: "Bloqueadas",
    description:
      "Personas que no pudieron empezar o seguir por un requisito ausente.",
  },
  {
    value: "INDETERMINATE",
    label: "Sin conclusión",
    description: "Personas cuyo resultado no se pudo determinar con certeza.",
  },
  {
    value: "PASSED",
    label: "Pasaron",
    description: "Personas que recorrieron el flujo y cumplieron cada paso.",
  },
  {
    value: "CANCELLED",
    label: "Canceladas",
    description: "Personas detenidas porque se canceló la corrida.",
  },
];

/**
 * Persona → paso → intento. Se pide una página de personas por vez y los pasos de UNA persona al
 * abrirla; los cuerpos de respuesta sólo se pintan al abrir un paso concreto. Una corrida de cien
 * personas por diez pasos son mil respuestas: pintarlas todas colgaba la pestaña.
 */
export function PersonaStepResults({
  runId,
  live,
}: Readonly<{ runId: string; live: boolean }>) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [openPersona, setOpenPersona] = useState<string | null>(null);
  const personas = useQaRunPersonas(
    runId,
    { page, limit: PAGE_SIZE, status: status === "ALL" ? undefined : status },
    live,
  );

  return (
    <section aria-label="Personas de la corrida" className="space-y-3">
      <div className="max-w-xs">
        <Field
          label="Mostrar personas"
          tooltip="Filtra la lista por el desenlace de cada persona; la corrida no cambia."
        >
          <Select
            name="qa-run-persona-status"
            options={STATUS_FILTER}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </Field>
      </div>
      {personas.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {personas.error ? (
        <ErrorState
          title="No se pudieron leer las personas"
          {...errorProps(personas.error)}
        />
      ) : null}
      {personas.data ? (
        <>
          {personas.data.items.length === 0 ? (
            <p className="text-sm text-atlas-muted">
              Ninguna persona con ese desenlace todavía.
            </p>
          ) : (
            <ul className="divide-y divide-atlas-border rounded-xl border border-atlas-border">
              {personas.data.items.map((persona) => {
                const open = openPersona === persona.personaKey;
                return (
                  <li key={persona.personaKey}>
                    <button
                      type="button"
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-atlas-soft"
                      onClick={() =>
                        setOpenPersona(open ? null : persona.personaKey)
                      }
                    >
                      {open ? (
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      )}
                      <span className="font-mono text-xs">
                        #{persona.ordinal}
                      </span>
                      <Badge tone={statusTone(persona.status)}>
                        {persona.status}
                      </Badge>
                      <span className="text-xs text-atlas-muted">
                        {persona.archetype} · {persona.caseCategory}
                      </span>
                      {persona.failedStepKey ? (
                        <span className="ml-auto truncate text-xs text-red-700">
                          {persona.failedStepKey}: {persona.reason}
                        </span>
                      ) : null}
                    </button>
                    {open ? (
                      <PersonaSteps
                        runId={runId}
                        personaKey={persona.personaKey}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <Pagination
            meta={{
              page: personas.data.page,
              limit: personas.data.limit,
              total: personas.data.total,
              totalPages: Math.ceil(
                personas.data.total / Math.max(personas.data.limit, 1),
              ),
            }}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </section>
  );
}

function PersonaSteps({
  runId,
  personaKey,
}: Readonly<{ runId: string; personaKey: string }>) {
  const steps = useQaPersonaSteps(runId, personaKey);
  const [openStep, setOpenStep] = useState<string | null>(null);
  if (steps.isLoading)
    return (
      <div className="px-3 pb-3">
        <LoadingSkeleton rows={2} />
      </div>
    );
  if (steps.error)
    return (
      <div className="px-3 pb-3">
        <ErrorState
          title="No se pudieron leer los pasos"
          {...errorProps(steps.error)}
        />
      </div>
    );
  return (
    <ol
      className="space-y-1.5 px-3 pb-3"
      aria-label={`Pasos de la persona ${personaKey}`}
    >
      {(steps.data ?? []).map((step) => (
        <li
          key={step.stepKey}
          className="rounded-lg border border-atlas-border bg-white"
        >
          <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 text-xs">
            <Badge tone={statusTone(step.status)}>{step.status}</Badge>
            <span className="font-mono">{step.stepKey}</span>
            <span className="text-atlas-muted">
              {step.evidence.method} {step.evidence.path}
            </span>
            {step.rootCauseStepKey && step.rootCauseStepKey !== step.stepKey ? (
              <span className="text-atlas-muted">
                por {step.rootCauseStepKey}
              </span>
            ) : null}
            <Button
              variant="ghost"
              className="ml-auto h-7 px-2 text-xs"
              aria-expanded={openStep === step.stepKey}
              onClick={() =>
                setOpenStep(openStep === step.stepKey ? null : step.stepKey)
              }
            >
              {openStep === step.stepKey
                ? "Ocultar intentos"
                : `Intentos (${step.attempts.length})`}
            </Button>
          </div>
          {step.reason ? (
            <p className="px-2.5 pb-1.5 text-xs text-red-700">{step.reason}</p>
          ) : null}
          {openStep === step.stepKey ? <StepAttempts step={step} /> : null}
        </li>
      ))}
    </ol>
  );
}

function StepAttempts({ step }: Readonly<{ step: QaPersonaStep }>) {
  return (
    <div className="space-y-2 border-t border-atlas-border p-2.5 text-xs">
      {step.failures.length > 0 ? (
        <ul className="space-y-0.5 text-red-800">
          {step.failures.map((failure, index) => (
            <li key={`${failure.code}-${index}`}>
              {failure.message}
              {failure.path ? (
                <span className="font-mono"> · {failure.path}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <table className="w-full text-left">
        <thead className="text-atlas-muted">
          <tr>
            <th className="py-1 font-medium">Intento</th>
            <th className="py-1 font-medium">Respuesta</th>
            <th className="py-1 font-medium">Latencia</th>
            <th className="py-1 font-medium">Espera de turno</th>
            <th className="py-1 font-medium">Request ID</th>
          </tr>
        </thead>
        <tbody>
          {step.attempts.map((attempt) => (
            <tr key={attempt.attempt} className="border-t border-atlas-border">
              <td className="py-1">{attempt.attempt}</td>
              <td className="py-1">
                {attempt.transportError ?? attempt.errorCode ?? attempt.status}
              </td>
              <td className="py-1 tabular-nums">{attempt.latencyMs} ms</td>
              <td className="py-1 tabular-nums">{attempt.admissionLagMs} ms</td>
              <td className="py-1 font-mono">{attempt.requestId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
