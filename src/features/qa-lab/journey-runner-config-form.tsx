"use client";

import { AUTH_MODE_OPTIONS, ENVIRONMENT_OPTIONS } from "./qa-lab-options";
import { BaseRouteSelect } from "./base-route-select";
import { CheckBox, NumberField } from "./qa-controls";
import { DeviceProfileField } from "./qa-device-field";
import { Field, Input, Select } from "@/shared/components/ui/input";
import type { QaAuthMode } from "./types";

export type JourneyRunnerConfig = {
  environment: string;
  baseRouteKey: string;
  customHostUrl: string;
  dryRun: boolean;
  timeoutMs: number;
  authMode: QaAuthMode;
  customAuthToken: string;
  deviceProfile: string;
  includeTenantHeader: boolean;
  includeIdempotencyKey: boolean;
};

export function JourneyRunnerConfigFields({
  config,
  onChange,
}: Readonly<{
  config: JourneyRunnerConfig;
  onChange: (value: Partial<JourneyRunnerConfig>) => void;
}>) {
  return (
    <>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Field
          label="Ambiente"
          tooltip="Contra qué entorno corre el recorrido completo; decide el host base."
        >
          <Select
            name="ambiente"
            options={ENVIRONMENT_OPTIONS}
            value={config.environment}
            onChange={(valor) => onChange({ environment: valor })}
          />
        </Field>
        <NumberField
          label="Timeout ms por paso"
          tooltip="Milisegundos que espera cada paso antes de darlo por fallido."
          value={config.timeoutMs}
          min={1000}
          max={120000}
          onChange={(value) => onChange({ timeoutMs: value })}
        />
        <Field
          label="Auth mode"
          tooltip="Qué credencial llevan todos los pasos del recorrido."
        >
          <Select
            name="auth-mode"
            options={AUTH_MODE_OPTIONS}
            value={config.authMode}
            onChange={(valor) => onChange({ authMode: valor as QaAuthMode })}
          />
        </Field>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <BaseRouteSelect
          value={config.baseRouteKey}
          onChange={(value) => onChange({ baseRouteKey: value })}
        />
        <Field
          label="Host URL manual"
          tooltip="Host completo cuando la ruta base es «Host URL manual». Ej.: https://staging-api.atlas.local"
        >
          <Input
            value={config.customHostUrl}
            onChange={(event) =>
              onChange({ customHostUrl: event.target.value })
            }
            placeholder="https://staging-api.atlas.local"
          />
        </Field>
      </div>
      {config.authMode === "custom" ? (
        <Field
          label="Token manual (Bearer)"
          tooltip="Token JWT de otro actor, sin el prefijo Bearer, para probar sus permisos."
        >
          <Input
            value={config.customAuthToken}
            onChange={(event) =>
              onChange({ customAuthToken: event.target.value })
            }
            className="font-mono"
          />
        </Field>
      ) : null}
      <DeviceProfileField
        value={config.deviceProfile}
        onChange={(value) => onChange({ deviceProfile: value })}
      />
      <div className="flex flex-wrap gap-3">
        <CheckBox
          label="Dry-run / modo seguro"
          checked={config.dryRun}
          onChange={(value) => onChange({ dryRun: value })}
        />
        <CheckBox
          label="Incluir x-tenant-id"
          checked={config.includeTenantHeader}
          onChange={(value) => onChange({ includeTenantHeader: value })}
        />
        <CheckBox
          label="Incluir x-idempotency-key"
          checked={config.includeIdempotencyKey}
          onChange={(value) => onChange({ includeIdempotencyKey: value })}
        />
      </div>
    </>
  );
}
