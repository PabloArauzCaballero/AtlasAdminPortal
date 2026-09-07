import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-atlas-text shadow-sm placeholder:text-slate-500 transition-all hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-atlas-text shadow-subtle transition-[border-color,box-shadow,background-color] duration-150 hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-atlas-text shadow-sm placeholder:text-slate-500 transition-all hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: Readonly<{
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="block space-y-1.5">
      {/*
       * `block` en la etiqueta, y no sólo en el `<label>` que la envuelve.
       *
       * Un `<span>` es inline y un `<input>` es inline-block: sólo caen en renglones distintos
       * porque el input es `w-full`, y `w-full` se resuelve contra el ancho del contenedor.
       * Dentro de una rejilla eso es todo el ancho de la celda y funciona; dentro de un
       * contenedor FLEXIBLE el `<label>` se encoge a su contenido, el porcentaje se vuelve
       * circular y etiqueta e input acaban en la misma línea: «Ventana (días) [30]». Se veía en
       * las barras de filtros de las auditorías de proveedores.
       */}
      <span className="block text-sm font-medium text-atlas-text">{label}</span>
      {children}
      {hint ? (
        <span className="block text-xs text-atlas-muted">{hint}</span>
      ) : null}
      {error ? (
        <span className="block text-xs font-medium text-red-600">{error}</span>
      ) : null}
    </label>
  );
}
