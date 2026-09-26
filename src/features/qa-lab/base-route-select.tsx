import { Field, Select } from "@/shared/components/ui/input";
import { QA_BASE_ROUTE_OPTIONS } from "./base-routes";

export function BaseRouteSelect({
  value,
  onChange,
}: Readonly<BaseRouteSelectProps>) {
  return (
    <Field
      label="Ruta base"
      tooltip="Contra qué host se lanza la prueba; la opción elegida explica a dónde apunta."
    >
      <Select
        name="ruta-base"
        value={value}
        onChange={onChange}
        options={QA_BASE_ROUTE_OPTIONS.map((option) => ({
          value: option.key,
          label: option.label,
          description: option.hint,
        }))}
      />
    </Field>
  );
}

type BaseRouteSelectProps = {
  value: string;
  onChange: (value: string) => void;
};
