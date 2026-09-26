"use client";

import { AUTH_MODE_OPTIONS, ENVIRONMENT_OPTIONS } from "./qa-lab-options";
import { BaseRouteSelect } from "./base-route-select";
import { CheckBox, NumberField } from "./qa-controls";
import { DeviceProfileField } from "./qa-device-field";
import { MockScenarioFields } from "./mock-scenario-fields";
import { QaSeedField } from "./fakers/qa-seed-field";
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
  mockScenario?: string;
  mockLatencyMs?: number;
  /** Cuántas veces se recorre la secuencia — simula N personas por el mismo flujo. */
  iterations: number;
  concurrency: number;
  seed: string;
};

export function JourneyRunnerConfigFields({
  config,
  onChange,
  singleRun = false,
}: Readonly<{
  config: JourneyRunnerConfig;
  onChange: (value: Partial<JourneyRunnerConfig>) => void;
  /**
   * Oculta «Cantidad de personas» y «Concurrencia». El editor manual es diagnóstico de UN
   * recorrido: las N personas se lanzan desde el catálogo, en el servidor.
   */
  singleRun?: boolean;
}>) {
  return (
    <>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Field
          label="Ambiente"
          tooltip="Contra qué API corre el recorrido completo; decide la dirección base."
        >
          <Select
            name="ambiente"
            options={ENVIRONMENT_OPTIONS}
            value={config.environment}
            onChange={(valor) => onChange({ environment: valor })}
          />
        </Field>
        <NumberField
          label="Espera máxima por paso (ms)"
          tooltip="Milisegundos que espera cada paso antes de darlo por fallido."
          value={config.timeoutMs}
          min={1000}
          max={120000}
          onChange={(value) => onChange({ timeoutMs: value })}
        />
        <Field
          label="Credencial de la petición"
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
          label="Dirección manual"
          tooltip="Dirección completa cuando la ruta base es «Otra dirección, escrita a mano». Ej.: https://staging-api.atlas.local"
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
      {config.baseRouteKey === "MOCK_PROVIDERS" ? (
        <MockScenarioFields
          mockScenario={config.mockScenario}
          mockLatencyMs={config.mockLatencyMs}
          onChange={onChange}
        />
      ) : null}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {singleRun ? null : (
          <>
            <NumberField
              label="Cantidad de personas"
              tooltip="Cuántas veces se recorre la secuencia completa, cada una con su propia persona sintética. Es lo que simula un flujo real con volumen, no una corrida suelta."
              hint="1 = una sola corrida (el comportamiento de antes). Hasta 200 por lote."
              value={config.iterations}
              min={1}
              max={200}
              onChange={(value) => onChange({ iterations: value })}
            />
            <NumberField
              label="Personas a la vez"
              tooltip="Cuántas personas atraviesan el journey al mismo tiempo."
              value={config.concurrency}
              min={1}
              max={20}
              onChange={(value) => onChange({ concurrency: value })}
            />
          </>
        )}
        <QaSeedField
          seed={config.seed}
          onChange={(value) => onChange({ seed: value })}
          name="semilla-journey"
        />
      </div>
      {config.authMode === "custom" ? (
        <Field
          label="Token de otro actor"
          tooltip="Token de acceso de otro actor, sin el prefijo Bearer, para probar sus permisos."
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
      {/*
        Sin checkbox de "Dry-run": el modo lo deciden los dos botones del panel
        ("Previsualizar" / "Ejecutar journey real"), no un interruptor aparte que podía quedar
        marcado sin que el operador lo notara — ver el comentario en journey-runner-panel.tsx.
      */}
      <div className="flex flex-wrap gap-3">
        <CheckBox
          label="Enviar la cabecera de empresa (x-tenant-id)"
          checked={config.includeTenantHeader}
          onChange={(value) => onChange({ includeTenantHeader: value })}
        />
        <CheckBox
          label="Enviar clave anti-duplicados (x-idempotency-key)"
          checked={config.includeIdempotencyKey}
          onChange={(value) => onChange({ includeIdempotencyKey: value })}
        />
      </div>
    </>
  );
}
