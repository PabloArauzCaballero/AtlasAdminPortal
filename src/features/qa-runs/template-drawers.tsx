"use client";

import { useEffect } from "react";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useQaPreflight, useQaSampleInputs, useQaTemplate } from "./run-hooks";
import {
  DEFAULT_SEED,
  initialForm,
  templateKeyOf,
  toRunRequest,
} from "./run-launch-form";
import { PreflightResult, TemplateRouteSummary } from "./run-preflight-result";
import { ACTOR_LABEL, errorProps } from "./run-status";
import type { TemplateAction } from "./template-card";
import type { QaCapabilities, QaTemplateSummary } from "./types";

/** El panel lateral de una tarjeta: pasos, datos de ejemplo o previsualización de la preparación. */
export function TemplateDrawer({
  action,
  template,
  capabilities,
  onClose,
}: Readonly<{
  action: Exclude<TemplateAction, "run">;
  template: QaTemplateSummary;
  capabilities?: QaCapabilities;
  onClose: () => void;
}>) {
  const titles = {
    steps: `Pasos de ${template.name}`,
    data: `Datos de ejemplo de ${template.name}`,
    preview: `Previsualizar ${template.name}`,
  } as const;
  return (
    <DrawerPanel open title={titles[action]} onClose={onClose}>
      <div className="space-y-4 p-5">
        <TemplateRouteSummary template={template} />
        {action === "steps" ? <TemplateSteps template={template} /> : null}
        {action === "data" ? <SampleData template={template} /> : null}
        {action === "preview" ? (
          <PreviewPreflight template={template} capabilities={capabilities} />
        ) : null}
      </div>
    </DrawerPanel>
  );
}

function TemplateSteps({
  template,
}: Readonly<{ template: QaTemplateSummary }>) {
  const detail = useQaTemplate(template.code, template.version);
  if (detail.isLoading) return <LoadingSkeleton rows={4} />;
  if (detail.error)
    return (
      <ErrorState
        title="No se pudieron leer los pasos"
        {...errorProps(detail.error)}
      />
    );
  return (
    <ol className="space-y-2">
      {(detail.data?.steps ?? []).map((step, index) => (
        <li
          key={step.stepKey}
          className="rounded-lg border border-atlas-border p-2.5 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-atlas-muted">{index + 1}.</span>
            <MethodBadge method={step.method} />
            <span className="font-mono">{step.path}</span>
            <Badge tone="muted">{ACTOR_LABEL[step.actor] ?? step.actor}</Badge>
          </div>
          <p className="mt-1 text-atlas-muted">
            <span className="font-mono">{step.stepKey}</span> · espera{" "}
            {step.expectStatus.join(" o ")}
            {step.dependsOn.length > 0
              ? ` · después de ${step.dependsOn.join(", ")}`
              : ""}
          </p>
          {step.branches.length > 0 ? (
            <p className="mt-0.5 text-atlas-muted">
              Ramas:{" "}
              {step.branches
                .map((branch) => `${branch.label} (${branch.status.join("/")})`)
                .join(" · ")}
            </p>
          ) : null}
          {step.providers.length > 0 ? (
            <p className="mt-0.5 text-atlas-muted">
              Proveedores:{" "}
              {step.providers
                .map(
                  (p) => `${p.provider}${p.expectCall ? "" : " (no se llama)"}`,
                )
                .join(", ")}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function SampleData({ template }: Readonly<{ template: QaTemplateSummary }>) {
  const sample = useQaSampleInputs();
  const { mutate } = sample;
  useEffect(() => {
    mutate({
      code: template.code,
      version: template.version,
      seed: DEFAULT_SEED,
      count: 5,
      datasetMode: template.datasetModes.includes("NORMAL_SYNTHETIC")
        ? "NORMAL_SYNTHETIC"
        : (template.datasetModes[0] ?? "NORMAL_SYNTHETIC"),
    });
  }, [mutate, template]);
  if (sample.isPending) return <LoadingSkeleton rows={3} />;
  if (sample.error)
    return (
      <ErrorState
        title="No se pudieron generar los datos"
        {...errorProps(sample.error)}
      />
    );
  return (
    <div className="space-y-2">
      <p className="text-xs text-atlas-muted">
        Cinco personas de la semilla «{DEFAULT_SEED}». Generarlas no crea
        cuentas ni llama a nadie; los correos y teléfonos son de prueba.
      </p>
      <ul className="space-y-1.5">
        {(sample.data?.personas ?? []).map((persona) => (
          <li
            key={persona.personaKey}
            className="rounded-lg border border-atlas-border p-2.5 text-xs"
          >
            <p className="font-medium text-atlas-text">
              #{persona.ordinal} {persona.firstName} {persona.lastName} ·{" "}
              {persona.city}
            </p>
            <p className="text-atlas-muted">
              {persona.archetype} · {persona.caseCategory} · ingreso{" "}
              {persona.monthlyIncome} · nacimiento {persona.birthDate}
            </p>
            <p className="font-mono text-atlas-muted">
              {persona.email} · {persona.phone}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewPreflight({
  template,
  capabilities,
}: Readonly<{ template: QaTemplateSummary; capabilities?: QaCapabilities }>) {
  const preflight = useQaPreflight();
  const { mutate } = preflight;
  useEffect(() => {
    if (!capabilities?.environments.length) return;
    const form = initialForm([template], capabilities, templateKeyOf(template));
    mutate(toRunRequest(form, template));
  }, [mutate, template, capabilities]);
  if (!capabilities?.environments.length)
    return (
      <p className="text-sm text-atlas-muted">
        No hay entornos de QA disponibles.
      </p>
    );
  if (preflight.isPending) return <LoadingSkeleton rows={3} />;
  if (preflight.error)
    return (
      <ErrorState
        title="No se pudo validar la preparación"
        {...errorProps(preflight.error)}
      />
    );
  return preflight.data ? (
    <div className="space-y-2">
      <p className="text-xs text-atlas-muted">
        Con los valores por defecto. Previsualizar no ejecuta nada: para lanzar,
        usa «Ejecutar».
      </p>
      <PreflightResult preflight={preflight.data} />
    </div>
  ) : null;
}
