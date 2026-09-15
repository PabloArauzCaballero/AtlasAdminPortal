"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { FieldTooltip } from "./field-tooltip";

/**
 * La fila de etiqueta de cualquier campo: texto, asterisco de obligatorio y el ⓘ de ayuda.
 *
 * Antes la etiqueta la pintaba cada sitio a mano (`<Field>`, la barra de filtros, los formularios
 * sueltos) y al añadir el tooltip habrían salido cinco copias del mismo marcado. La etiqueta es un
 * `<label htmlFor>` de verdad —no un `<span>` envolvente— porque el botón de ayuda tiene que vivir
 * FUERA de ella: dentro, su nombre entraría en el nombre accesible del control.
 *
 * Sin `htmlFor` pinta un `<span>`: sirve para grupos (`fieldset`) y para controles compuestos que
 * no tienen un único elemento al que apuntar.
 */
export function FieldLabel({
  htmlFor,
  label,
  required,
  tooltip,
  describedById,
  controlFocused,
  className,
}: Readonly<{
  /** `id` del control al que nombra. */
  htmlFor?: string;
  label: ReactNode;
  required?: boolean;
  /** Qué poner en el campo y por qué importa. Sin él no se pinta el ⓘ. */
  tooltip?: string;
  /** `id` del `<span>` oculto con la ayuda, al que apunta el `aria-describedby` del control. */
  describedById?: string;
  /** El control tiene el foco: la burbuja se abre sin tocar el ratón. */
  controlFocused?: boolean;
  className?: string;
}>) {
  const text = (
    <>
      {label}
      {required ? (
        <span className="ml-0.5 text-red-600" aria-hidden>
          *
        </span>
      ) : null}
    </>
  );
  const name = typeof label === "string" ? label : "este campo";

  return (
    <span className={cn("flex items-center gap-1", className)}>
      {htmlFor ? (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-atlas-text"
        >
          {text}
        </label>
      ) : (
        <span className="text-sm font-medium text-atlas-text">{text}</span>
      )}
      {tooltip ? (
        <FieldTooltip
          label={name}
          text={tooltip}
          describedById={describedById}
          open={controlFocused ?? false}
        />
      ) : null}
    </span>
  );
}
