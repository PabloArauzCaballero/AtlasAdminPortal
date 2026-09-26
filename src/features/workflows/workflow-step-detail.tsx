"use client";

import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import type { WorkflowStep } from "./types";
import {
  DetailField,
  DetailList,
  DetailSection,
} from "./workflow-detail-primitives";
import { WorkflowStepTrial } from "./workflow-step-trial";

/**
 * Ficha del paso: el endpoint concreto que el flujo recorre, con lo que el
 * catálogo declara de él — quién puede llamarlo, en qué estado del cliente,
 * qué deja detrás y de qué pasos depende.
 */
export function WorkflowStepDetail({ step }: Readonly<{ step: WorkflowStep }>) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-atlas-accent">
          Paso del flujo
        </p>
        <h3 className="mt-0.5 text-sm font-semibold text-atlas-text">
          {step.name}
        </h3>
        <p className="mt-1 break-all font-mono text-xs text-atlas-muted">
          {step.routePath}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <MethodBadge method={step.httpMethod} />
        <Badge tone={step.isMandatory ? "info" : "muted"}>
          {step.isMandatory ? "obligatorio" : "opcional"}
        </Badge>
        {step.requiresAuth ? (
          <Badge>requiere sesión</Badge>
        ) : (
          <Badge tone="muted">público</Badge>
        )}
        {step.requiresIdempotencyKey ? (
          <Badge tone="warning">idempotencia</Badge>
        ) : null}
        {step.isRepeatable ? <Badge tone="muted">repetible</Badge> : null}
        {step.isFlowEntry ? (
          <Badge tone="success">entrada del flujo</Badge>
        ) : null}
        {step.isFlowExit ? (
          <Badge tone="critical">salida del flujo</Badge>
        ) : null}
      </div>

      {step.description ? (
        <p className="text-xs leading-5 text-atlas-muted">{step.description}</p>
      ) : null}

      <DetailField label="Código de endpoint" value={step.endpointCode} mono />

      <DetailList
        title="Roles autorizados"
        items={step.allowedRoles}
        empty="Sin restricción de rol declarada."
      />
      <DetailList
        title="Estados requeridos del cliente"
        items={step.requiredStates}
        empty="No exige un estado concreto."
      />
      <DetailList
        title="Estados que deja"
        items={step.resultingStates}
        empty="No cambia el estado del cliente."
      />

      <DetailSection
        title="Depende de"
        isEmpty={step.dependsOn.length === 0}
        empty="No depende de ningún paso: puede ejecutarse por su cuenta."
      >
        {step.dependsOn.map((dependency) => (
          <li key={dependency.stepCode} className="leading-5">
            <code className="font-mono text-[0.6875rem] text-purple-700">
              {dependency.stepCode}
            </code>{" "}
            · {dependency.dependencyType}
            {dependency.description ? ` — ${dependency.description}` : ""}
          </li>
        ))}
      </DetailSection>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <DetailList
          title="Pasos anteriores"
          items={step.previousStepCodes}
          empty="Ninguno declarado."
          mono
        />
        <DetailList
          title="Pasos siguientes"
          items={step.nextStepCodes}
          empty="Ninguno declarado."
          mono
        />
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <DetailList
          title="Eventos que produce"
          items={step.producesEvents}
          empty="Ninguno."
          mono
        />
        <DetailList
          title="Eventos que consume"
          items={step.consumesEvents}
          empty="Ninguno."
          mono
        />
      </div>

      <WorkflowStepTrial step={step} />

      {step.possibleErrors.length > 0 ? (
        <DetailSection title="Errores posibles" isEmpty={false} empty="">
          {step.possibleErrors.map((error, index) => (
            <li key={index} className="leading-5">
              <code className="font-mono text-[0.6875rem] text-red-700">
                {describeError(error)}
              </code>
            </li>
          ))}
        </DetailSection>
      ) : null}
    </div>
  );
}

function describeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const code = record.code ?? record.errorCode ?? "";
    const status = record.httpStatus ?? record.status ?? "";
    const detail = [status, code].filter(Boolean).join(" · ");
    return detail || JSON.stringify(error);
  }
  return String(error);
}
