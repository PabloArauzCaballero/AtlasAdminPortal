"use client";

import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import type { Option } from "@/shared/lib/options";
import { OptionSelect } from "./option-select";

/**
 * `OptionSelect` atado a react-hook-form.
 *
 * Hasta ahora los formularios escribían `<Select {...register("estado")}>` con `<option>` dentro.
 * `register` devuelve props de un control nativo (`ref`, `onChange` con un evento), y el select
 * propio no es un `<select>`: el valor vive en un input oculto y se avisa con el valor ya
 * extraído. `Controller` es el puente que RHF ofrece justo para esto, y aquí está envuelto una
 * vez para que cada formulario sea una línea: `<FormSelect control={control} name="estado"
 * options={ESTADO_OPTIONS} />`.
 */
export function FormSelect<TFieldValues extends FieldValues>({
  control,
  name,
  options,
  disabled,
  required,
  placeholder,
  ariaLabel,
  className,
}: Readonly<{
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  options: Option[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <OptionSelect
          name={field.name}
          options={options}
          value={field.value == null ? "" : String(field.value)}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled ?? field.disabled}
          required={required}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          className={className}
        />
      )}
    />
  );
}
