"use client";

import { Info } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { fieldHelp } from "./field-help-catalog";

/**
 * Punto de información accesible junto a una etiqueta de campo. Muestra el
 * tooltip por hover y por foco de teclado, con aria-label para lectores.
 */
export function InfoDot({
  text,
  label,
  className,
}: Readonly<{ text: string; label?: string; className?: string }>) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label ? `Ayuda: ${label}. ${text}` : `Ayuda. ${text}`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-atlas-muted hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-atlas-border bg-white p-2 text-xs leading-5 text-atlas-text opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

/**
 * Etiqueta de campo con ayuda del catálogo: label + punto de info (tooltip),
 * texto guía y ejemplo. Un solo componente para explicar cualquier campo de
 * forma consistente. Si la clave no existe en el catálogo, no rompe: sólo pinta
 * el label recibido.
 */
export function FieldHelpLabel({
  fieldKey,
  fallbackLabel,
  htmlFor,
  showExample = true,
}: Readonly<{
  fieldKey: string;
  fallbackLabel?: string;
  htmlFor?: string;
  showExample?: boolean;
}>) {
  const entry = fieldHelp(fieldKey);
  const label = entry?.label ?? fallbackLabel ?? fieldKey;
  return (
    <div className="mb-1" data-tutorial-id={`field-${fieldKey}`}>
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-atlas-text"
        >
          {label}
        </label>
        {entry ? <InfoDot text={entry.tooltip} label={label} /> : null}
      </div>
      {entry ? (
        <p className="mt-0.5 text-xs leading-5 text-atlas-muted">
          {entry.help}
        </p>
      ) : null}
      {entry?.example && showExample ? (
        <p className="mt-0.5 text-xs leading-5 text-atlas-muted">
          <span className="font-medium">Ejemplo: </span>
          {entry.example}
        </p>
      ) : null}
    </div>
  );
}
