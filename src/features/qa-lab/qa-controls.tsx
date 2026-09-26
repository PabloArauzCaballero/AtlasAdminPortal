import type { EndpointItem } from "@/features/systems/types";
import { AUTH_MODE_OPTIONS } from "./qa-lab-options";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { BaseRouteSelect } from "./base-route-select";
import { MockScenarioFields } from "./mock-scenario-fields";
import { getQaScenario, QA_SCENARIOS } from "./qa-scenarios";
import type { QaAuthMode } from "./types";

export function QaTargetControls({
  form,
  endpoint,
  onChange,
}: Readonly<QaTargetControlsProps>) {
  const defaultPath = endpoint?.fullPath || endpoint?.routePath || "";
  const targetsMock = form.baseRouteKey === "MOCK_PROVIDERS";
  return (
    <>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <BaseRouteSelect
          value={form.baseRouteKey}
          onChange={(value) => onChange({ baseRouteKey: value })}
        />
        <Field
          label="Host URL manual"
          tooltip="Host completo a probar cuando la ruta base es «Host URL manual». Ej.: https://staging-api.atlas.local"
          hint="Se usa cuando Ruta base es Host URL manual."
        >
          <Input
            value={form.customHostUrl}
            onChange={(event) =>
              onChange({ customHostUrl: event.target.value })
            }
            placeholder="https://staging-api.atlas.local"
          />
        </Field>
      </div>
      <Field
        label="Ruta/path del endpoint"
        tooltip="Sobrescribe la ruta del catálogo, p. ej. para rellenar un :id concreto."
        hint={`Acepta path relativo o URL completa. Default: ${defaultPath || "sin ruta"}`}
      >
        <Input
          value={form.routeOverride}
          onChange={(event) => onChange({ routeOverride: event.target.value })}
          placeholder={defaultPath || "https://host/api/v1/recurso/:id"}
          className="font-mono"
        />
      </Field>
      {targetsMock ? (
        <MockScenarioFields
          mockScenario={form.mockScenario}
          mockLatencyMs={form.mockLatencyMs}
          onChange={onChange}
        />
      ) : null}
    </>
  );
}

export function QaExpectationsControls({
  form,
  onChange,
  variant = "functional",
}: Readonly<QaExpectationsControlsProps>) {
  if (variant === "stress") {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Field
          label="HTTP esperados"
          tooltip="Códigos de estado que dan la prueba por buena, separados por coma."
          hint="Ej: 200, 201, 204"
        >
          <Input
            value={form.expectedStatusCodes}
            onChange={(event) =>
              onChange({ expectedStatusCodes: event.target.value })
            }
          />
        </Field>
      </div>
    );
  }
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      <Field
        label="HTTP esperados"
        tooltip="Códigos de estado que dan la prueba por buena, separados por coma."
        hint="Ej: 200, 201, 204"
      >
        <Input
          value={form.expectedStatusCodes}
          onChange={(event) =>
            onChange({ expectedStatusCodes: event.target.value })
          }
        />
      </Field>
      <NumberField
        label="Max latencia ms"
        tooltip="Latencia máxima aceptable; si la respuesta tarda más, la prueba falla."
        value={form.maxLatencyMs}
        min={0}
        max={120000}
        hint="Falla la prueba si la respuesta tarda más de este umbral (0 = sin límite)."
        onChange={(value) => onChange({ maxLatencyMs: value })}
      />
      <NumberField
        label="Max respuesta bytes"
        tooltip="Tamaño máximo del cuerpo de respuesta; detecta listados sin paginar."
        value={form.maxResponseSizeBytes}
        min={0}
        max={10000000}
        hint="Falla la prueba si el body de respuesta pesa más que esto (0 = sin límite)."
        onChange={(value) => onChange({ maxResponseSizeBytes: value })}
      />
      <Field
        label="Respuesta contiene"
        tooltip="Texto que debe aparecer en la respuesta; si falta, la prueba falla."
        hint="Texto plano que debe aparecer en el body de la respuesta."
      >
        <Input
          value={form.expectedBodyContains}
          onChange={(event) =>
            onChange({ expectedBodyContains: event.target.value })
          }
          placeholder="texto requerido en body"
        />
      </Field>
    </div>
  );
}

export function QaScenarioControls({
  form,
  onChange,
}: Readonly<QaScenarioControlsProps>) {
  const active = getQaScenario(form.scenario ?? "valid_payload");
  return (
    <div className="space-y-3 rounded-xl border border-atlas-border bg-atlas-soft p-3">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Field
          label="Escenario de prueba"
          tooltip="Caso común ya preparado; al elegirlo rellena payload y expectativas."
          hint="Preconfigura payload/expectativas para un caso común (payload inválido, sin auth, etc.)."
        >
          <Select
            name="escenario"
            value={active.key}
            options={QA_SCENARIOS.map((scenario) => ({
              value: scenario.key,
              label: scenario.label,
              description: `${scenario.description} Resultado esperado: ${scenario.expectedOutcome}`,
            }))}
            onChange={(valor) => {
              const scenario = getQaScenario(valor);
              onChange({
                scenario: scenario.key,
                ...(scenario.patch ?? {}),
              });
            }}
          />
        </Field>
        <Field
          label="Auth mode efectivo"
          tooltip="Qué credencial lleva la petición; sirve para probar accesos sin cambiar de sesión."
          hint="Con qué credencial se firma el request, sin importar tu sesión actual."
        >
          <Select
            name="auth-mode"
            value={form.authMode}
            options={AUTH_MODE_OPTIONS}
            onChange={(valor) => onChange({ authMode: valor as QaAuthMode })}
          />
        </Field>
      </div>
      {/* La descripción y el resultado esperado del escenario los repite el select bajo el campo. */}
      {form.authMode === "custom" ? (
        <Field
          label="Token manual (Bearer)"
          tooltip="Token JWT de otro actor, sin el prefijo Bearer. No lo guardes en notas."
          hint="Pega un token de otro actor (customer/merchant/qa_engineer/etc.) para probar la matriz de permisos."
        >
          <Input
            value={form.customAuthToken}
            onChange={(event) =>
              onChange({ customAuthToken: event.target.value })
            }
            placeholder="eyJhbGciOi..."
            className="font-mono"
          />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <CheckBox
          label="Incluir x-tenant-id"
          checked={form.includeTenantHeader}
          onChange={(value) => onChange({ includeTenantHeader: value })}
        />
        <CheckBox
          label="Incluir x-idempotency-key"
          checked={form.includeIdempotencyKey}
          onChange={(value) => onChange({ includeIdempotencyKey: value })}
        />
      </div>
    </div>
  );
}

export function NumberField({
  label,
  tooltip,
  value,
  min,
  max,
  hint,
  onChange,
}: Readonly<NumberFieldProps>) {
  return (
    <Field label={label} tooltip={tooltip} hint={hint}>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

export function CheckBox(props: Readonly<CheckBoxProps>) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-atlas-border px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      {props.label}
    </label>
  );
}

export type CommonLabFormState = {
  baseRouteKey: string;
  customHostUrl: string;
  routeOverride: string;
  expectedStatusCodes: string;
  expectedBodyContains: string;
  maxLatencyMs: number;
  maxResponseSizeBytes: number;
  scenario: string;
  authMode: QaAuthMode;
  customAuthToken: string;
  includeTenantHeader: boolean;
  includeIdempotencyKey: boolean;
  deviceProfile: string;
  /** Escenario a forzar en el mock de proveedores externos (x-mock-scenario). "" = sin forzar. */
  mockScenario?: string;
  /** Latencia exacta a forzar en el mock (x-mock-latency-ms), en ms. 0 = sin forzar. */
  mockLatencyMs?: number;
};

type QaTargetControlsProps = {
  form: CommonLabFormState;
  endpoint?: EndpointItem;
  onChange: (value: Partial<CommonLabFormState>) => void;
};

type QaScenarioControlsProps = {
  form: CommonLabFormState;
  onChange: (value: Partial<CommonLabFormState>) => void;
};

type QaExpectationsControlsProps = {
  form: CommonLabFormState;
  onChange: (value: Partial<CommonLabFormState>) => void;
  variant?: "functional" | "stress";
};

type NumberFieldProps = {
  label: string;
  /** Qué poner y por qué importa. */
  tooltip: string;
  value: number;
  min: number;
  max: number;
  hint?: string;
  onChange: (value: number) => void;
};

type CheckBoxProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};
