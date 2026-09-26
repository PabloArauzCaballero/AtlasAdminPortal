"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Play, ShieldCheck, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  useLaunchQaRun,
  useQaCapabilities,
  useQaPreflight,
  useQaTemplates,
} from "./run-hooks";
import { RunLaunchFields } from "./run-launch-fields";
import {
  findEnvironment,
  findTemplate,
  initialForm,
  localProblems,
  toRunRequest,
  type LaunchForm,
} from "./run-launch-form";
import { PreflightResult, TemplateRouteSummary } from "./run-preflight-result";
import { disabledMessage, errorProps, launchErrorView } from "./run-status";
import type { QaCapabilities, QaTemplateSummary } from "./types";

/**
 * El único camino para ejecutar N personas: se valida la preparación en el servidor y sólo con
 * un plan LISTO se ofrece «Ejecutar». Lo que se lanza es el plan validado (`planId` + `planHash`),
 * no lo que el formulario diga después: cualquier cambio de campo descarta la validación.
 */
export function RunLaunchDialog({
  open,
  workflowCode,
  templateKey,
  onClose,
  onLaunched,
}: Readonly<{
  open: boolean;
  /** Sólo plantillas de este flujo (desde el árbol). */
  workflowCode?: string;
  /** Plantilla preseleccionada (desde una tarjeta del catálogo), `code@version`. */
  templateKey?: string;
  onClose: () => void;
  onLaunched: (runId: string) => void;
}>) {
  const titleId = useId();
  const capabilities = useQaCapabilities();
  const templates = useQaTemplates(workflowCode);
  return (
    <DialogShell
      open={open}
      labelledBy={titleId}
      onClose={onClose}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="atlas-scrollbar max-h-[92vh] w-full max-w-2xl animate-scale-in overflow-y-auto overflow-x-hidden rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-base font-semibold text-atlas-text">
            Ejecutar recorrido con personas
          </h2>
          <p className="mt-1 text-sm text-atlas-muted">
            Cada persona recorre el flujo completo con su propia cuenta. La
            corrida sigue en el servidor aunque cierres esta pestaña.
          </p>
        </div>
        <Button
          variant="ghost"
          className="h-8 w-8 px-0"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="mt-4">
        {capabilities.isLoading || templates.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : capabilities.error || templates.error ? (
          <ErrorState
            title="No se pudo preparar el lanzamiento"
            {...errorProps(capabilities.error ?? templates.error)}
            onRetry={() => {
              void capabilities.refetch();
              void templates.refetch();
            }}
          />
        ) : capabilities.data && !capabilities.data.enabled ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {disabledMessage(capabilities.data)} Sólo se ejecutan en entornos
            aislados de prueba.
          </p>
        ) : capabilities.data && templates.data ? (
          <LaunchBody
            capabilities={capabilities.data}
            templates={templates.data}
            preferredKey={templateKey}
            workflowCode={workflowCode}
            onCancel={onClose}
            onLaunched={onLaunched}
          />
        ) : null}
      </div>
    </DialogShell>
  );
}

function LaunchBody({
  capabilities,
  templates,
  preferredKey,
  workflowCode,
  onCancel,
  onLaunched,
}: Readonly<{
  capabilities: QaCapabilities;
  templates: QaTemplateSummary[];
  preferredKey?: string;
  workflowCode?: string;
  onCancel: () => void;
  onLaunched: (runId: string) => void;
}>) {
  const [form, setForm] = useState<LaunchForm>(() =>
    initialForm(templates, capabilities, preferredKey),
  );
  const preflight = useQaPreflight();
  const launch = useLaunchQaRun();
  const template = findTemplate(templates, form.templateKey);
  const environment = findEnvironment(capabilities, form.environmentId);
  const problems = useMemo(
    () => localProblems(form, template, environment),
    [form, template, environment],
  );

  // Se avisa UNA vez por corrida: `onLaunched` suele ser una flecha nueva en cada render.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    const id = launch.data?.runId;
    if (!id || announced.current === id) return;
    announced.current = id;
    onLaunched(id);
  }, [launch.data, onLaunched]);

  function change(next: LaunchForm) {
    setForm(next);
    // Lo validado era OTRO formulario: se descarta para no lanzar algo distinto de lo que se ve.
    preflight.reset();
    launch.reset();
  }

  const ready =
    preflight.data?.status === "READY" &&
    preflight.data.planId &&
    preflight.data.planHash;
  const launchError = launch.error ? launchErrorView(launch.error) : null;
  const planGone = Boolean(launchError?.revalidate);

  if (templates.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-atlas-muted">
        Todavía no hay plantillas de recorrido para este flujo. Las plantillas
        las publica el catálogo de QA; cuando exista una, aparecerá aquí.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!capabilities.worker.ready ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          El ejecutor de corridas no está respondiendo: la validación lo marcará
          como bloqueo.
        </p>
      ) : null}
      <RunLaunchFields
        form={form}
        templates={templates}
        capabilities={capabilities}
        onChange={change}
      />
      {template ? <TemplateRouteSummary template={template} /> : null}
      {problems.length > 0 ? (
        <ul
          className="list-disc space-y-1 pl-5 text-xs text-amber-800"
          aria-label="Falta completar"
        >
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}
      {preflight.error ? (
        <ErrorState
          title="No se pudo validar la preparación"
          {...errorProps(preflight.error)}
        />
      ) : null}
      {preflight.data ? <PreflightResult preflight={preflight.data} /> : null}
      {launchError ? (
        <ErrorState
          title={launchError.title}
          description={launchError.description}
          requestId={launchError.requestId}
        />
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-atlas-border pt-4">
        <Button onClick={onCancel} disabled={launch.isPending}>
          Cancelar
        </Button>
        <Button
          disabled={problems.length > 0 || !template}
          isLoading={preflight.isPending}
          loadingText="Validando…"
          onClick={() =>
            template &&
            preflight.mutate(toRunRequest(form, template, workflowCode))
          }
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Validar preparación
        </Button>
        <Button
          variant="primary"
          disabled={!ready || planGone}
          isLoading={launch.isPending}
          loadingText="Lanzando…"
          title={ready ? undefined : "Primero valida la preparación."}
          onClick={() => {
            const data = preflight.data;
            if (!data?.planId || !data.planHash || launch.isPending) return;
            launch.mutate({ planId: data.planId, planHash: data.planHash });
          }}
        >
          <Play className="h-4 w-4" aria-hidden />
          Ejecutar {preflight.data?.plan?.persons ?? form.persons} personas en{" "}
          {environment?.label ?? "—"}
          {preflight.data?.plan
            ? ` · ≤ ${preflight.data.plan.limits.maxRequests ?? preflight.data.plan.estimatedRequests} peticiones`
            : ""}
        </Button>
      </div>
    </div>
  );
}
