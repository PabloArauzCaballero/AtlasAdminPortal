"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { FieldLabel } from "@/shared/components/ui/field-label";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import {
  pathParamNames,
  runWorkflowStepTrial,
  type WorkflowStepTrial as WorkflowStepTrialResult,
} from "./services";
import type { WorkflowStep } from "./types";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
/** Techo duro de repeticiones: este panel prueba un paso, no reemplaza el stress del QA Lab. */
const MAX_REPEAT = 50;

/**
 * Prueba del paso desde el propio lienzo: rellenar los parámetros de ruta, ver
 * el cuerpo que el catálogo declara y mandarlo.
 *
 * El payload se propone a partir de `inputContract` —lo que el catálogo dice
 * que el endpoint espera—, así que la prueba parte del contrato publicado y no
 * de lo que uno recuerde. Un método que escribe pide confirmación: va contra el
 * backend configurado, no contra un simulador.
 *
 * `repeat` manda la MISMA llamada varias veces seguidas: es lo que permite ver este paso del
 * flujo bajo una cantidad real de tráfico sin salir del lienzo. Sigue yendo por
 * `runWorkflowStepTrial` — mismo canal, misma sesión, mismo host propio del portal — así que
 * repetir no abre ninguna puerta que la prueba de un solo tiro no tuviera ya.
 */
export function WorkflowStepTrial({ step }: Readonly<{ step: WorkflowStep }>) {
  const params = useMemo(
    () => pathParamNames(step.routePath),
    [step.routePath],
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [payload, setPayload] = useState(() => draftPayload(step));
  const [repeat, setRepeat] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const writes = !READ_METHODS.has(step.httpMethod.toUpperCase());

  const trial = useMutation({
    mutationFn: async () => {
      const body = writes ? parsePayload(payload) : undefined;
      const count = clampRepeat(repeat);
      const results: WorkflowStepTrialResult[] = [];
      for (let index = 0; index < count; index += 1) {
        results.push(
          await runWorkflowStepTrial({
            method: step.httpMethod,
            routePath: step.routePath,
            pathParams: values,
            payload: body,
          }),
        );
      }
      return results;
    },
    onSettled: () => setConfirmOpen(false),
  });

  function launch() {
    if (writes) {
      try {
        parsePayload(payload);
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : "JSON inválido");
        return;
      }
    }
    setJsonError(null);
    // Un método de lectura de un solo tiro no pide confirmación (ya era así); repetirlo sí:
    // mandar la misma llamada varias veces es una acción de volumen, no una lectura suelta, y
    // vale la pena que el operador vea cuánto va a salir antes de que salga.
    if (writes || clampRepeat(repeat) > 1) {
      setConfirmOpen(true);
      return;
    }
    trial.mutate();
  }

  const missing = params.filter((name) => !values[name]?.trim());

  return (
    <div className="space-y-2 rounded-lg border border-atlas-border bg-atlas-soft p-2.5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        Probar este paso
      </p>

      {params.length > 0 ? (
        <div className="space-y-1.5">
          {params.map((name) => (
            <div key={name} className="block">
              <FieldLabel
                className="font-mono text-[0.6875rem] text-atlas-muted"
                label={`:${name}`}
                tooltip={`Valor que sustituye al parámetro :${name} de la ruta en la llamada de prueba.`}
              />
              <input
                aria-label={`Valor de :${name}`}
                value={values[name] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [name]: event.target.value,
                  }))
                }
                placeholder={`valor de ${name}`}
                className="mt-0.5 h-8 w-full rounded-md border border-atlas-border bg-white px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
              />
            </div>
          ))}
        </div>
      ) : null}

      {writes ? (
        <div className="block">
          <FieldLabel
            className="text-[0.6875rem] text-atlas-muted"
            label="Payload de prueba (propuesto por el contrato declarado)"
            tooltip="JSON que se envía en la llamada de prueba; parte del contrato declarado del paso."
          />
          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            rows={6}
            spellCheck={false}
            aria-label="Payload de prueba"
            className="atlas-scrollbar mt-0.5 w-full rounded-md border border-atlas-border bg-white p-2 font-mono text-[0.6875rem] leading-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
          />
        </div>
      ) : null}

      <div className="block max-w-[10rem]">
        <FieldLabel
          className="text-[0.6875rem] text-atlas-muted"
          label="Cantidad"
          tooltip={`Cuántas veces se manda esta misma llamada seguida — simula este paso con volumen sin salir del lienzo. Hasta ${MAX_REPEAT}.`}
        />
        <input
          type="number"
          min={1}
          max={MAX_REPEAT}
          aria-label="Cantidad de veces a enviar"
          value={repeat}
          onChange={(event) => setRepeat(Number(event.target.value) || 1)}
          className="mt-0.5 h-8 w-full rounded-md border border-atlas-border bg-white px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
        />
      </div>

      {jsonError ? (
        <p className="text-[0.6875rem] text-red-700">
          JSON inválido: {jsonError}
        </p>
      ) : null}
      {missing.length > 0 ? (
        <p className="text-[0.6875rem] leading-4 text-amber-700">
          Sin valor para {missing.map((name) => `:${name}`).join(", ")}: la ruta
          se enviará con el marcador literal y el backend responderá 404 o 422.
        </p>
      ) : null}

      <Button
        variant="secondary"
        onClick={launch}
        isLoading={trial.isPending}
        loadingText="Enviando…"
      >
        <Play className="h-4 w-4" />
        Enviar {step.httpMethod}
      </Button>

      {trial.data ? <TrialResults results={trial.data} /> : null}

      <ConfirmDialog
        open={confirmOpen}
        title={
          clampRepeat(repeat) > 1
            ? `Enviar ${step.httpMethod} ${clampRepeat(repeat)} veces`
            : `Enviar ${step.httpMethod} de verdad`
        }
        description={
          clampRepeat(repeat) > 1
            ? `Esta llamada va contra el backend configurado en el portal. Se ejecutará ${step.routePath} ${clampRepeat(repeat)} veces seguidas, ${writes ? "con el payload indicado" : "sin cuerpo"}.`
            : `Esta llamada va contra el backend configurado en el portal y ${step.httpMethod} escribe. Se ejecutará ${step.routePath} con el payload indicado.`
        }
        confirmText="Enviar"
        isLoading={trial.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => trial.mutate()}
      />
    </div>
  );
}

function clampRepeat(value: number): number {
  return Math.min(
    Math.max(Number.isFinite(value) ? Math.round(value) : 1, 1),
    MAX_REPEAT,
  );
}

/**
 * Con una sola llamada se ve exactamente igual que antes de admitir `repeat`: el volumen no
 * cambia la lectura de una prueba suelta. Con más de una, se agrega éxito/latencia y cada
 * respuesta queda disponible para inspección individual.
 */
function TrialResults({
  results,
}: Readonly<{ results: WorkflowStepTrialResult[] }>) {
  if (results.length === 1) return <SingleTrialResult result={results[0]} />;
  const okCount = results.filter((result) => result.ok).length;
  const latencies = results
    .map((result) => result.latencyMs)
    .sort((a, b) => a - b);
  const avg = Math.round(
    latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length,
  );
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={okCount === results.length ? "success" : "critical"}>
          {okCount}/{results.length} OK
        </Badge>
        <Badge>prom. {avg} ms</Badge>
        <Badge tone="muted">
          p95{" "}
          {latencies[Math.floor(latencies.length * 0.95)] ?? latencies.at(-1)}{" "}
          ms
        </Badge>
      </div>
      <ol className="space-y-1">
        {results.map((result, index) => (
          <li
            key={index}
            className="flex flex-wrap items-center gap-1.5 rounded-md border border-atlas-border bg-white px-2 py-1"
          >
            <span className="text-[0.6875rem] text-atlas-muted">
              #{index + 1}
            </span>
            <Badge tone={result.ok ? "success" : "critical"}>
              HTTP {result.status || "sin respuesta"}
            </Badge>
            <Badge>{result.latencyMs} ms</Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SingleTrialResult({
  result,
}: Readonly<{ result: WorkflowStepTrialResult }>) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={result.ok ? "success" : "critical"}>
          HTTP {result.status || "sin respuesta"}
        </Badge>
        <Badge>{result.latencyMs} ms</Badge>
        {result.requestId ? (
          <Badge tone="muted">req {result.requestId.slice(0, 8)}</Badge>
        ) : null}
      </div>
      <p className="break-all font-mono text-[0.6875rem] text-atlas-muted">
        {result.method} {result.path}
      </p>
      <JsonViewer title="Respuesta" value={result.body} />
    </div>
  );
}

function parsePayload(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed);
}

/** Esqueleto a partir del contrato: las claves reales, con el tipo como pista. */
function draftPayload(step: WorkflowStep): string {
  const contract = step.inputContract;
  if (!contract || Object.keys(contract).length === 0) return "{}";
  const draft = Object.fromEntries(
    Object.entries(contract).map(([key, value]) => [key, `<${String(value)}>`]),
  );
  return JSON.stringify(draft, null, 2);
}
