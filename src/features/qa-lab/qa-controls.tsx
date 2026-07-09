import type { EndpointItem } from "@/features/systems/types";
import { Field, Input } from "@/shared/components/ui/input";
import { BaseRouteSelect } from "./base-route-select";

export function QaTargetControls({
  form,
  endpoint,
  onChange,
}: Readonly<QaTargetControlsProps>) {
  const defaultPath = endpoint?.fullPath || endpoint?.routePath || "";
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <BaseRouteSelect
          value={form.baseRouteKey}
          onChange={(value) => onChange({ baseRouteKey: value })}
        />
        <Field
          label="Host URL manual"
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
        hint={`Acepta path relativo o URL completa. Default: ${defaultPath || "sin ruta"}`}
      >
        <Input
          value={form.routeOverride}
          onChange={(event) => onChange({ routeOverride: event.target.value })}
          placeholder={defaultPath || "https://host/api/v1/recurso/:id"}
          className="font-mono"
        />
      </Field>
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
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="HTTP esperados" hint="Ej: 200, 201, 204">
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
    <div className="grid gap-4 md:grid-cols-3">
      <Field label="HTTP esperados" hint="Ej: 200, 201, 204">
        <Input
          value={form.expectedStatusCodes}
          onChange={(event) =>
            onChange({ expectedStatusCodes: event.target.value })
          }
        />
      </Field>
      <NumberField
        label="Max latencia ms"
        value={form.maxLatencyMs}
        min={0}
        max={120000}
        onChange={(value) => onChange({ maxLatencyMs: value })}
      />
      <NumberField
        label="Max respuesta bytes"
        value={form.maxResponseSizeBytes}
        min={0}
        max={10000000}
        onChange={(value) => onChange({ maxResponseSizeBytes: value })}
      />
      <Field label="Respuesta contiene">
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

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: Readonly<NumberFieldProps>) {
  return (
    <Field label={label}>
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
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

type CheckBoxProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};
