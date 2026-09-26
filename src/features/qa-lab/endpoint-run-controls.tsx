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
import { expectedStatusesText } from "./qa-form";

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
  /** «Datos inválidos» pide un caso inválido al generador. */
  onInvalidCase?: () => void;
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
  onInvalidCase,
}: Readonly<RunControlsProps>) {
  const method = endpoint?.method ?? "GET";
  const requiresMutationGuard =
    isMutatingMethod(method) || Boolean(endpoint?.isDestructive);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Field
          label="Ambiente"
          tooltip="Contra qué API corre la prueba; en producción sólo se puede previsualizar."
          hint="Decide la dirección base a la que va la petición."
        >
          <Select
            name="ambiente"
            options={ENVIRONMENT_OPTIONS}
            value={form.environment}
            onChange={(valor) => onChange({ environment: valor })}
          />
        </Field>
        <NumberField
          label="Espera máxima (ms)"
          tooltip="Milisegundos que se espera la respuesta antes de dar la petición por fallida."
          value={form.timeoutMs}
          min={1000}
          max={120000}
          hint="Pasado este tiempo sin respuesta, la petición cuenta como error."
          onChange={(value) => onChange({ timeoutMs: value })}
        />
        <Field
          label="Método"
          tooltip="Verbo HTTP de la operación elegida; no se cambia aquí sino eligiendo otra operación."
          hint="Lo fija la operación elegida."
        >
          <Input value={method} readOnly className="font-mono" />
        </Field>
      </div>
      <QaTargetControls form={form} endpoint={endpoint} onChange={onChange} />
      <QaScenarioControls
        form={form}
        onChange={onChange}
        contractStatuses={expectedStatusesText(endpoint?.expectedStatusCodes)}
        onInvalidCase={onInvalidCase}
      />
      <QaDeviceControls form={form} onChange={onChange} />
      <QaExpectationsControls form={form} onChange={onChange} />
      <div className="flex flex-wrap gap-3">
        <CheckBox
          label="Sólo previsualizar (no envía nada)"
          checked={form.dryRun}
          onChange={(value) => onChange({ dryRun: value })}
        />
        {requiresMutationGuard ? (
          <CheckBox
            label="Permitir cambios reales"
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
        {endpoint.requiresAuth ? "requiere sesión" : "sin sesión"}
      </Badge>
      <Badge tone={endpoint.isReadonly ? "success" : "warning"}>
        {endpoint.isReadonly ? "sólo lectura" : "cambia datos"}
      </Badge>
      {endpoint.isDestructive ? (
        <Badge tone="critical">destructivo</Badge>
      ) : null}
      {endpoint.testEnvironmentOnly ? (
        <Badge tone="warning">sólo pruebas</Badge>
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
          : error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : "No se pudo ejecutar la operación."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
    />
  );
}
