import { Select, Field } from "@/shared/components/ui/input";

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
        name={label}
        value={value ? "true" : "false"}
        onChange={(valor) => onChange(valor === "true")}
        options={[
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ]}
      />
    </Field>
  );
}
