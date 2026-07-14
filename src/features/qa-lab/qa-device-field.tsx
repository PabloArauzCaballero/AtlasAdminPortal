import { Field, Select } from "@/shared/components/ui/input";
import { getQaDeviceProfile, QA_DEVICE_PROFILES } from "./qa-device-profiles";
import type { CommonLabFormState } from "./qa-controls";

export function QaDeviceControls({
  form,
  onChange,
}: Readonly<{
  form: CommonLabFormState;
  onChange: (value: Partial<CommonLabFormState>) => void;
}>) {
  return (
    <DeviceProfileField
      value={form.deviceProfile}
      onChange={(value) => onChange({ deviceProfile: value })}
    />
  );
}

export function DeviceProfileField({
  value,
  onChange,
}: Readonly<{ value?: string; onChange: (value: string) => void }>) {
  const active = getQaDeviceProfile(value);
  return (
    <div className="space-y-2 rounded-xl border border-atlas-border bg-atlas-soft p-3">
      <Field
        label="Simulador de dispositivo / cliente"
        hint="Agrega headers de simulación al request para probar reglas de riesgo/fraude por dispositivo."
      >
        <Select
          value={active.key}
          onChange={(event) => onChange(event.target.value)}
        >
          {QA_DEVICE_PROFILES.map((profile) => (
            <option key={profile.key} value={profile.key}>
              {profile.label}
            </option>
          ))}
        </Select>
      </Field>
      <p className="text-xs text-atlas-muted">{active.description}</p>
      {Object.keys(active.headers).length ? (
        <p className="break-all font-mono text-[11px] text-atlas-muted">
          {Object.entries(active.headers)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
