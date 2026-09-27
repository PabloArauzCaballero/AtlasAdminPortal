import { Field, Select } from "@/shared/components/ui/input";
import {
  QA_BASE_ROUTE_OPTIONS,
  VISIBLE_QA_BASE_ROUTE_KEYS,
} from "./base-routes";

export function BaseRouteSelect({
  value,
  onChange,
}: Readonly<BaseRouteSelectProps>) {
  return (
    <Field
      label="Destino"
      tooltip="Contra qué host se lanza la prueba; la opción elegida explica a dónde apunta."
    >
      <Select
        name="ruta-base"
        value={value}
        onChange={onChange}
        options={QA_BASE_ROUTE_OPTIONS.filter(
          (option) =>
            VISIBLE_QA_BASE_ROUTE_KEYS.includes(option.key) ||
            option.key === value,
        ).map((option) => ({
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
