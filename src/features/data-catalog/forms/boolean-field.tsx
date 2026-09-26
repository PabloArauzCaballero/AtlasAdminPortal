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
    <Field
      tooltip={`Indica si «${label}» se cumple para esta entidad del catálogo.`}
      label={label}
    >
      <Select
        name={label}
        value={value ? "true" : "false"}
        onChange={(valor) => onChange(valor === "true")}
        options={[
          {
            value: "true",
            label: "Sí",
            description: "Se cumple para esta entidad.",
          },
          {
            value: "false",
            label: "No",
            description: "No se cumple para esta entidad.",
          },
        ]}
      />
    </Field>
  );
}
