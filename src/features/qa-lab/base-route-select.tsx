import { Field, Select } from "@/shared/components/ui/input";
import { getQaBaseRouteHint, QA_BASE_ROUTE_OPTIONS } from "./base-routes";

export function BaseRouteSelect({
  value,
  onChange,
}: Readonly<BaseRouteSelectProps>) {
  return (
    <Field label="Ruta base" hint={getQaBaseRouteHint(value)}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {QA_BASE_ROUTE_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

type BaseRouteSelectProps = {
  value: string;
  onChange: (value: string) => void;
};
