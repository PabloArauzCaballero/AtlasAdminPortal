"use client";

import { useEffect } from "react";
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
import { errorProps } from "./run-status";
import {
  SamplePersonasTable,
  TemplateStepsTable,
} from "./template-drawer-tables";
import type { TemplateAction } from "./template-columns";
import type { QaCapabilities, QaTemplateSummary } from "./types";

/** El panel lateral de una fila del catálogo: pasos, datos de ejemplo o previsualización de la preparación. */
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
  return <TemplateStepsTable steps={detail.data?.steps ?? []} />;
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
      <SamplePersonasTable personas={sample.data?.personas ?? []} />
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
