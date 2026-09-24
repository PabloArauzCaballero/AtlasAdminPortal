"use client";

import { Field, Input, Select } from "@/shared/components/ui/input";
import type { Option } from "@/shared/lib/options";
import { DATASET_OPTIONS, matchedStepsLabel } from "./run-status";
import {
  findEnvironment,
  findTemplate,
  withTemplate,
  type LaunchForm,
} from "./run-launch-form";
import type { QaCapabilities, QaTemplateSummary } from "./types";

/**
 * Los campos del lanzamiento. Personas y concurrencia son DOS campos: cuántas personas recorren el
 * flujo y cuántas lo recorren a la vez son decisiones distintas (10 personas de una en una no
 * cargan el sistema; 10 a la vez, sí).
 */
export function RunLaunchFields({
  form,
  templates,
  capabilities,
  onChange,
}: Readonly<{
  form: LaunchForm;
  templates: readonly QaTemplateSummary[];
  capabilities: QaCapabilities;
  onChange: (next: LaunchForm) => void;
}>) {
  const template = findTemplate(templates, form.templateKey);
  const environment = findEnvironment(capabilities, form.environmentId);
  const templateOptions: Option[] = templates.map((item) => ({
    value: `${item.code}@${item.version}`,
    label: `${item.name} · v${item.version}`,
    description:
      item.status === "READY"
        ? `${matchedStepsLabel(item) ?? `${item.stepCount} pasos`}; termina en «${item.expectedTerminal}».`
        : `No se puede ejecutar: ${item.blockedReasons.join("; ") || "plantilla en borrador"}.`,
    disabled: item.status !== "READY",
  }));
  const environmentOptions: Option[] = capabilities.environments.map(
    (item) => ({
      value: item.environmentId,
      label: item.label,
      description: `Entorno ${item.deploymentEnvironment}: hasta ${item.maxPersons} personas y ${item.maxConcurrency} a la vez.`,
    }),
  );
  const datasetOptions: Option[] = (template?.datasetModes ?? []).map(
    (mode) =>
      DATASET_OPTIONS[mode] ?? { value: mode, label: mode, description: mode },
  );
  const scenarioOptions: Option[] = (template?.scenarios ?? []).map((code) => ({
    value: code,
    label: code === template?.defaultScenario ? `${code} (por defecto)` : code,
    description:
      code === template?.defaultScenario
        ? "El escenario con el que la plantilla está pensada para ejecutarse."
        : "Escenario alternativo que la plantilla declara como soportado.",
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field
          label="Plantilla de recorrido"
          tooltip="El recorrido completo que hará cada persona, paso a paso, tal como lo declara el catálogo de QA."
        >
          <Select
            name="qa-run-template"
            options={templateOptions}
            value={form.templateKey}
            emptyLabel="No hay plantillas para este flujo."
            onChange={(value) =>
              onChange(withTemplate(form, findTemplate(templates, value)))
            }
          />
        </Field>
      </div>
      <Field
        label="Personas"
        tooltip="Cuántas personas sintéticas recorren el flujo completo, cada una con su propia cuenta y sesión."
        hint={environment ? `Máximo ${environment.maxPersons}.` : undefined}
      >
        <Input
          type="number"
          min={1}
          max={environment?.maxPersons}
          value={Number.isNaN(form.persons) ? "" : form.persons}
          onChange={(event) =>
            onChange({ ...form, persons: event.target.valueAsNumber })
          }
        />
      </Field>
      <Field
        label="Concurrencia"
        tooltip="Cuántas de esas personas avanzan a la vez. No cambia cuántas se ejecutan, sólo el ritmo."
        hint={
          environment
            ? `Máximo ${environment.maxConcurrency} a la vez.`
            : undefined
        }
      >
        <Input
          type="number"
          min={1}
          max={environment?.maxConcurrency}
          value={Number.isNaN(form.concurrency) ? "" : form.concurrency}
          onChange={(event) =>
            onChange({ ...form, concurrency: event.target.valueAsNumber })
          }
        />
      </Field>
      <Field
        label="Datos"
        tooltip="Qué clase de personas se generan: válidas, que el sistema debe rechazar, en el límite o una mezcla."
      >
        <Select
          name="qa-run-dataset"
          options={datasetOptions}
          value={form.datasetMode}
          onChange={(value) =>
            onChange({
              ...form,
              datasetMode: value as LaunchForm["datasetMode"],
            })
          }
        />
      </Field>
      <Field
        label="Escenario"
        tooltip="Cómo responden los proveedores simulados durante la corrida; por defecto, el camino feliz de la plantilla."
      >
        <Select
          name="qa-run-scenario"
          options={scenarioOptions}
          value={form.scenarioCode}
          onChange={(value) => onChange({ ...form, scenarioCode: value })}
        />
      </Field>
      <Field
        label="Semilla"
        tooltip="Misma semilla, mismas personas: sirve para repetir una corrida y comparar resultados."
      >
        <Input
          value={form.seed}
          onChange={(event) => onChange({ ...form, seed: event.target.value })}
        />
      </Field>
      <Field
        label="Entorno de QA"
        tooltip="Dónde se ejecuta la corrida. Sólo se ofrecen entornos aislados para pruebas."
      >
        <Select
          name="qa-run-environment"
          options={environmentOptions}
          value={form.environmentId}
          onChange={(value) => onChange({ ...form, environmentId: value })}
        />
      </Field>
    </div>
  );
}
