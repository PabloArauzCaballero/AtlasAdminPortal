import type { EndpointItem } from "@/features/systems/types";
import { Field, Input } from "@/shared/components/ui/input";
import { BaseRouteSelect } from "./base-route-select";
import { MockScenarioFields } from "./mock-scenario-fields";
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
        {form.baseRouteKey === "CUSTOM_HOST" ? (
          <Field
            label="Dirección manual"
            tooltip="Dirección completa a probar, p. ej. https://staging-api.atlas.local. Tiene que estar en la lista de direcciones permitidas del portal."
          >
            <Input
              value={form.customHostUrl}
              onChange={(event) =>
                onChange({ customHostUrl: event.target.value })
              }
              placeholder="https://staging-api.atlas.local"
            />
          </Field>
        ) : null}
      </div>
      <Field
        label="Ruta de la operación"
        tooltip="Cambia la ruta que trae el catálogo, p. ej. para escribir un :id concreto."
        hint={`Acepta una ruta relativa o una dirección completa. Por defecto: ${defaultPath || "sin ruta"}`}
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
          tooltip="Códigos de respuesta que dan la prueba por buena, separados por coma."
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
        label="Tiempo máximo de respuesta (ms)"
        tooltip="Milisegundos aceptables; si la respuesta tarda más, la prueba falla."
        value={form.maxLatencyMs}
        min={0}
        max={120000}
        hint="La prueba falla si la respuesta tarda más que esto (0 = sin límite)."
        onChange={(value) => onChange({ maxLatencyMs: value })}
      />
      <NumberField
        label="Tamaño máximo de respuesta (bytes)"
        tooltip="Peso máximo de la respuesta; detecta listados que devuelven todo sin paginar."
        value={form.maxResponseSizeBytes}
        min={0}
        max={10000000}
        hint="La prueba falla si la respuesta pesa más que esto (0 = sin límite)."
        onChange={(value) => onChange({ maxResponseSizeBytes: value })}
      />
      <Field
        label="Respuesta contiene"
        tooltip="Texto que debe aparecer en la respuesta; si falta, la prueba falla."
        hint="Texto que debe aparecer en la respuesta."
      >
        <Input
          value={form.expectedBodyContains}
          onChange={(event) =>
            onChange({ expectedBodyContains: event.target.value })
          }
          placeholder="texto que debe aparecer"
        />
      </Field>
    </div>
  );
}

export { QaScenarioControls } from "./qa-scenario-controls";

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
