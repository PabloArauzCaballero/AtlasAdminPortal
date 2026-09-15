"use client";

import {
  useId,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/cn";
import { FieldContext, joinIds, useFieldContext } from "./field-context";
import { FieldLabel } from "./field-label";
import { OptionSelect, type OptionSelectProps } from "./option-select";

/**
 * Lo que cualquier control toma del `<Field>` que lo envuelve: su `id` (el `htmlFor` de la
 * etiqueta), el `aria-describedby` de la ayuda y los avisos de foco que abren la burbuja.
 *
 * Un `id` propio manda sobre el del campo: hay controles que ya lo traían puesto.
 */
function useControlProps(own: {
  id?: string;
  describedBy?: string;
  onFocus?: (event: never) => void;
  onBlur?: (event: never) => void;
}) {
  const field = useFieldContext();
  return {
    id: own.id ?? field?.id,
    "aria-describedby": joinIds(own.describedBy, field?.describedBy),
    onFieldFocus: field?.onFocus,
    onFieldBlur: field?.onBlur,
  };
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const field = useControlProps({
    id: props.id,
    describedBy: props["aria-describedby"],
  });
  return (
    <input
      {...props}
      id={field.id}
      aria-describedby={field["aria-describedby"]}
      onFocus={(event) => {
        field.onFieldFocus?.();
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        field.onFieldBlur?.();
        props.onBlur?.(event);
      }}
      className={cn(
        "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-atlas-text shadow-sm placeholder:text-slate-500 transition-all hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
        className,
      )}
    />
  );
}

/**
 * El `<select>` nativo del portal.
 *
 * Se conserva para los sitios donde la lista NO es un dominio cerrado que se pueda explicar (una
 * lista de identificadores, de rutas o de nombres propios que salen de los datos). Para cualquier
 * dominio con significado va `Select` con `options`, que pinta `OptionSelect` y enseña la
 * descripción de cada opción. El guardián `check-field-help.mjs` sólo admite `<select>` aquí.
 */
export function NativeSelect({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useControlProps({
    id: props.id,
    describedBy: props["aria-describedby"],
  });
  return (
    <select
      {...props}
      id={field.id}
      aria-describedby={field["aria-describedby"]}
      onFocus={(event) => {
        field.onFieldFocus?.();
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        field.onFieldBlur?.();
        props.onBlur?.(event);
      }}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-atlas-text shadow-subtle transition-[border-color,box-shadow,background-color] duration-150 hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100",
        className,
      )}
    />
  );
}

/**
 * El select del portal: recibe `options` y cada opción dice qué significa.
 *
 * Es `OptionSelect` con otro nombre para no tocar los 70 sitios que ya importaban `Select`. La
 * diferencia con el de antes es que ya no acepta `<option>` como hijos: una opción es
 * `{ value, label, description }`, y la descripción se ve en la fila desplegada y bajo el campo.
 */
export function Select(props: OptionSelectProps) {
  return <OptionSelect {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useControlProps({
    id: props.id,
    describedBy: props["aria-describedby"],
  });
  return (
    <textarea
      {...props}
      id={field.id}
      aria-describedby={field["aria-describedby"]}
      onFocus={(event) => {
        field.onFieldFocus?.();
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        field.onFieldBlur?.();
        props.onBlur?.(event);
      }}
      className={cn(
        "min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-atlas-text shadow-sm placeholder:text-slate-500 transition-all hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100",
        className,
      )}
    />
  );
}

/**
 * Un campo: etiqueta, ayuda, control, pista y error.
 *
 * ## Por qué ya no envuelve al control
 *
 * Hasta el 2026-09-15 la etiqueta era un `<label>` que ENVOLVÍA al control (asociación implícita) y
 * el texto iba en un `<span>` dentro. Con eso el botón ⓘ habría quedado dentro de la etiqueta, y un
 * botón dentro de un `<label>` mete su propio nombre en el nombre accesible del campo: `getByLabel`
 * deja de encontrar el control. Ahora la asociación es `htmlFor` + `id`, y el `id` se lo pasa al
 * control por contexto (`FieldContext`) para no tener que escribirlo en 252 sitios.
 *
 * ## Ayuda y pista no son lo mismo
 *
 * `tooltip` es «qué poner y por qué importa»: vive en el ⓘ, se lee al pasar el ratón, al enfocar el
 * icono y al enfocar el propio control, y siempre está en el `aria-describedby`. `hint` es el texto
 * gris permanente que ya había: se conserva donde estaba, debajo del control.
 */
export function Field({
  label,
  hint,
  error,
  tooltip,
  required,
  children,
}: Readonly<{
  label: string;
  /** Texto gris permanente bajo el control. */
  hint?: string;
  error?: string;
  /** Qué poner y por qué importa, con ejemplo si el formato no es obvio. Pinta el ⓘ. */
  tooltip?: string;
  required?: boolean;
  children: React.ReactNode;
}>) {
  const uid = useId();
  const id = `${uid}-campo`;
  const helpId = tooltip ? `${uid}-ayuda` : undefined;
  const hintId = hint ? `${uid}-pista` : undefined;
  const errorId = error ? `${uid}-error` : undefined;
  const [focused, setFocused] = useState(false);

  const context = useMemo(
    () => ({
      id,
      describedBy: joinIds(helpId, hintId, errorId),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    }),
    [id, helpId, hintId, errorId],
  );

  return (
    <div className="block space-y-1.5">
      <FieldLabel
        htmlFor={id}
        label={label}
        required={required}
        tooltip={tooltip}
        describedById={helpId}
        controlFocused={focused}
      />
      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>
      {hint ? (
        <span id={hintId} className="block text-xs text-atlas-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
          className="block text-xs font-medium text-red-600"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
