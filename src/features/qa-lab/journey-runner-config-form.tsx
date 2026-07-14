"use client";

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
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Ambiente">
          <Select
            value={config.environment}
            onChange={(event) => onChange({ environment: event.target.value })}
          >
            <option value="LOCAL">LOCAL</option>
            <option value="STAGING">STAGING</option>
            <option value="PRODUCTION_READONLY">PRODUCTION_READONLY</option>
          </Select>
        </Field>
        <NumberField
          label="Timeout ms por paso"
          value={config.timeoutMs}
          min={1000}
          max={120000}
          onChange={(value) => onChange({ timeoutMs: value })}
        />
        <Field label="Auth mode">
          <Select
            value={config.authMode}
            onChange={(event) =>
              onChange({ authMode: event.target.value as QaAuthMode })
            }
          >
            <option value="session">Sesión actual</option>
            <option value="none">Sin autenticación</option>
            <option value="invalid">Token inválido</option>
            <option value="custom">Token manual</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <BaseRouteSelect
          value={config.baseRouteKey}
          onChange={(value) => onChange({ baseRouteKey: value })}
        />
        <Field label="Host URL manual">
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
        <Field label="Token manual (Bearer)">
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
