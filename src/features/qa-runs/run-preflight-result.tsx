"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { ACTOR_LABEL, BLOCKER_HINT, matchedStepsLabel } from "./run-status";
import { formatDuration } from "./run-launch-form";
import type { QaPreflight, QaTemplateSummary } from "./types";

/** Qué recorre la plantilla y qué toca: se lee antes de validar nada. */
export function TemplateRouteSummary({
  template,
}: Readonly<{ template: QaTemplateSummary }>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-atlas-soft p-3 text-sm">
      <p className="text-atlas-text">{template.description}</p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-atlas-muted sm:grid-cols-2">
        <div>
          <dt className="inline font-medium text-atlas-text">Pasos: </dt>
          <dd className="inline">
            {template.stepCount}
            {matchedStepsLabel(template)
              ? ` · ${matchedStepsLabel(template)}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-atlas-text">
            Desenlace esperado:{" "}
          </dt>
          <dd className="inline">{template.expectedTerminal}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-atlas-text">Actúan: </dt>
          <dd className="inline">
            {template.actors
              .map((actor) => ACTOR_LABEL[actor] ?? actor)
              .join(", ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-atlas-text">
            Proveedores simulados:{" "}
          </dt>
          <dd className="inline">
            {template.providers.join(", ") || "ninguno"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * El desenlace de «Validar preparación»: o la lista de lo que bloquea (con qué hacer) o el plan
 * listo con los límites que el servidor va a aplicar de verdad.
 */
export function PreflightResult({
  preflight,
}: Readonly<{ preflight: QaPreflight }>) {
  if (preflight.status === "BLOCKED") {
    return (
      <div
        role="alert"
        className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          No se puede ejecutar todavía
        </p>
        <ul className="mt-2 space-y-2" aria-label="Motivos del bloqueo">
          {preflight.blockers.map((blocker, index) => (
            <li key={`${blocker.code}-${index}`}>
              <p>
                {blocker.message}
                {blocker.subject ? (
                  <span className="font-mono text-xs">
                    {" "}
                    · {blocker.subject}
                  </span>
                ) : null}
              </p>
              {BLOCKER_HINT[blocker.code] ? (
                <p className="text-xs text-amber-800">
                  {BLOCKER_HINT[blocker.code]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const plan = preflight.plan;
  return (
    <div
      role="status"
      className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
    >
      <p className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        Preparación lista
        <Badge tone="success">válida 15 min</Badge>
      </p>
      {plan ? (
        <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          <li>
            {plan.persons} personas, {plan.concurrency} a la vez
          </li>
          <li>{plan.stepCount} pasos por persona</li>
          <li>≈ {plan.estimatedRequests} peticiones estimadas</li>
          <li>
            Tope: {plan.limits.maxRequests ?? "—"} peticiones ·{" "}
            {formatDuration(plan.limits.maxDurationMs)}
          </li>
          <li>
            Entrada de todas las personas:{" "}
            {formatDuration(plan.estimatedAdmissionMs)}
          </li>
          <li>Proveedores: {plan.providers.join(", ") || "ninguno"}</li>
        </ul>
      ) : null}
    </div>
  );
}
