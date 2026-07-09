import { Field, Select } from "@/shared/components/ui/input";

export function BooleanField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}>) {
  return (
    <Field label={label}>
      <Select
        value={value ? "true" : "false"}
        onChange={(event) => onChange(event.target.value === "true")}
      >
        <option value="true">Sí</option>
        <option value="false">No</option>
      </Select>
    </Field>
  );
}
