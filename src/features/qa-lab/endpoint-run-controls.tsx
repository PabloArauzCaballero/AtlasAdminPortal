"use client";

import { ENVIRONMENT_OPTIONS } from "./qa-lab-options";
import type { EndpointItem } from "@/features/systems/types";
import { Badge } from "@/shared/components/ui/badges";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { normalizeExpectedStatuses } from "./assertions";
import {
  CheckBox,
  NumberField,
  QaExpectationsControls,
  QaScenarioControls,
  QaTargetControls,
  type CommonLabFormState,
} from "./qa-controls";
import { QaDeviceControls } from "./qa-device-field";
import { isMutatingMethod } from "./qa-safety";

export type EndpointRunFormState = CommonLabFormState & {
  environment: string;
  dryRun: boolean;
  timeoutMs: number;
  allowMutations: boolean;
  payload: string;
  queryParams: string;
  pathParams: string;
  headers: string;
  expectedHeaders: string;
  expectedJsonSubset: string;
};

type RunControlsProps = {
  form: EndpointRunFormState;
  endpoint?: EndpointItem;
  onChange: (value: Partial<EndpointRunFormState>) => void;
};

export function requiresDoubleConfirmation(
  form: EndpointRunFormState,
): boolean {
  return !form.dryRun && form.allowMutations && form.environment !== "LOCAL";
}

export function RunControls({
  form,
  endpoint,
  onChange,
}: Readonly<RunControlsProps>) {
  const method = endpoint?.method ?? "GET";
  const requiresMutationGuard =
    isMutatingMethod(method) || Boolean(endpoint?.isDestructive);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Field
          label="Ambiente"
          tooltip="Entorno contra el que corre la prueba; en producción sólo lectura."
          hint="Determina el host base contra el que corre la prueba."
        >
          <Select
            name="ambiente"
            options={ENVIRONMENT_OPTIONS}
            value={form.environment}
            onChange={(valor) => onChange({ environment: valor })}
          />
        </Field>
        <NumberField
          label="Timeout ms"
          tooltip="Milisegundos que espera la petición antes de marcarla como error."
          value={form.timeoutMs}
          min={1000}
          max={120000}
          hint="Tiempo máximo de espera antes de marcar la request como error."
          onChange={(value) => onChange({ timeoutMs: value })}
        />
        <Field
          label="Metodo"
          tooltip="Verbo HTTP del endpoint elegido; no se cambia aquí sino eligiendo otro endpoint."
          hint="Determinado por el endpoint seleccionado."
        >
          <Input value={method} readOnly className="font-mono" />
        </Field>
      </div>
      <QaTargetControls form={form} endpoint={endpoint} onChange={onChange} />
      <QaScenarioControls form={form} onChange={onChange} />
      <QaDeviceControls form={form} onChange={onChange} />
      <QaExpectationsControls form={form} onChange={onChange} />
      <div className="flex flex-wrap gap-3">
        <CheckBox
          label="Dry-run / modo seguro"
          checked={form.dryRun}
          onChange={(value) => onChange({ dryRun: value })}
        />
        {requiresMutationGuard ? (
          <CheckBox
            label="Permitir mutacion real"
            checked={form.allowMutations}
            onChange={(value) => onChange({ allowMutations: value })}
          />
        ) : null}
      </div>
    </div>
  );
}

export function EndpointSafetyHints({
  endpoint,
}: Readonly<{ endpoint?: EndpointItem }>) {
  if (!endpoint) return null;
  const expectedStatuses = normalizeExpectedStatuses(
    endpoint.expectedStatusCodes,
  );
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-atlas-border bg-atlas-soft p-3 text-xs">
      <Badge tone="default">esperado: {expectedStatuses.join(", ")}</Badge>
      <Badge tone={endpoint.requiresAuth ? "warning" : "success"}>
        {endpoint.requiresAuth ? "requiere sesion" : "sin auth"}
      </Badge>
      <Badge tone={endpoint.isReadonly ? "success" : "warning"}>
        {endpoint.isReadonly ? "readonly" : "cambia estado"}
      </Badge>
      {endpoint.isDestructive ? (
        <Badge tone="critical">destructivo</Badge>
      ) : null}
      {endpoint.testEnvironmentOnly ? (
        <Badge tone="warning">solo testing</Badge>
      ) : null}
    </div>
  );
}

export function MutationError({ error }: Readonly<{ error: unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error)
          ? error.message
          : "No se pudo ejecutar el endpoint."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
    />
  );
}
