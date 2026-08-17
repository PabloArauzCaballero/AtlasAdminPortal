"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { pathParamNames, runWorkflowStepTrial } from "./services";
import type { WorkflowStep } from "./types";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Prueba del paso desde el propio lienzo: rellenar los parámetros de ruta, ver
 * el cuerpo que el catálogo declara y mandarlo.
 *
 * El payload se propone a partir de `inputContract` —lo que el catálogo dice
 * que el endpoint espera—, así que la prueba parte del contrato publicado y no
 * de lo que uno recuerde. Un método que escribe pide confirmación: va contra el
 * backend configurado, no contra un simulador.
 */
export function WorkflowStepTrial({ step }: Readonly<{ step: WorkflowStep }>) {
  const params = useMemo(
    () => pathParamNames(step.routePath),
    [step.routePath],
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [payload, setPayload] = useState(() => draftPayload(step));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const writes = !READ_METHODS.has(step.httpMethod.toUpperCase());

  const trial = useMutation({
    mutationFn: async () => {
      const body = writes ? parsePayload(payload) : undefined;
      return runWorkflowStepTrial({
        method: step.httpMethod,
        routePath: step.routePath,
        pathParams: values,
        payload: body,
      });
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
      setJsonError(null);
      setConfirmOpen(true);
      return;
    }
    setJsonError(null);
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
            <label key={name} className="block">
              <span className="font-mono text-[0.6875rem] text-atlas-muted">
                :{name}
              </span>
              <input
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
            </label>
          ))}
        </div>
      ) : null}

      {writes ? (
        <label className="block">
          <span className="text-[0.6875rem] text-atlas-muted">
            Payload de prueba (propuesto por el contrato declarado)
          </span>
          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            rows={6}
            spellCheck={false}
            aria-label="Payload de prueba"
            className="atlas-scrollbar mt-0.5 w-full rounded-md border border-atlas-border bg-white p-2 font-mono text-[0.6875rem] leading-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
          />
        </label>
      ) : null}

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

      {trial.data ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={trial.data.ok ? "success" : "critical"}>
              HTTP {trial.data.status || "sin respuesta"}
            </Badge>
            <Badge>{trial.data.latencyMs} ms</Badge>
            {trial.data.requestId ? (
              <Badge tone="muted">req {trial.data.requestId.slice(0, 8)}</Badge>
            ) : null}
          </div>
          <p className="break-all font-mono text-[0.6875rem] text-atlas-muted">
            {trial.data.method} {trial.data.path}
          </p>
          <JsonViewer title="Respuesta" value={trial.data.body} />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={`Enviar ${step.httpMethod} de verdad`}
        description={`Esta llamada va contra el backend configurado en el portal y ${step.httpMethod} escribe. Se ejecutará ${step.routePath} con el payload indicado.`}
        confirmText="Enviar"
        isLoading={trial.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => trial.mutate()}
      />
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
