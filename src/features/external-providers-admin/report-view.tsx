"use client";

import { SlidersHorizontal } from "lucide-react";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";

type ReportQueryLike = {
  isLoading: boolean;
  error: unknown;
  data: unknown;
  refetch: () => unknown;
};

export function ReportView({
  query,
  title,
}: Readonly<{ query: ReportQueryLike; title: string }>) {
  if (query.isLoading) return <LoadingSkeleton rows={5} />;
  if (query.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(query.error)
            ? query.error.message
            : `No se pudo cargar "${title}".`
        }
        requestId={
          isAtlasApiError(query.error) ? query.error.requestId : undefined
        }
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!query.data) return null;
  return <JsonViewer title={title} value={query.data} />;
}

/**
 * La barra de filtros de un reporte.
 *
 * Antes cada pestaña dejaba sus campos sueltos sobre el lienzo, sin nada a lo que alinearse: dos
 * cajas flotando encima del bloque negro del JSON, a distinta altura según llevaran o no una
 * línea de pista debajo. Aquí van dentro de un carril con filo propio, y con `items-end` todos
 * los campos apoyan la CAJA en la misma línea de base.
 *
 * Los campos se declaran con un ancho fijo (`w-44`, `w-32`) porque un `Input` es `w-full` y en un
 * contenedor flexible sin base se queda en el ancho por defecto del navegador, distinto entre
 * un `type="text"` y un `type="number"`: la fila salía escalonada.
 */
export function ReportFilters({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-atlas-border bg-white p-3 shadow-subtle">
      <span className="flex h-11 items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-atlas-muted">
        <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
        Filtros
      </span>
      {children}
    </div>
  );
}

/**
 * Una casilla dentro de la barra de filtros.
 *
 * La caja va dentro de un bloque de la MISMA altura que un input (`h-11`) para que apoye en la
 * misma línea de base que los campos de al lado. Antes se conseguía con un `pb-2.5` a ojo, que
 * dejaba de cuadrar en cuanto cambiaba la altura del input.
 */
export function ReportCheckbox({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}>) {
  return (
    <label className="flex h-11 cursor-pointer items-center gap-2 text-sm text-atlas-text">
      <input
        type="checkbox"
        className="h-4 w-4 accent-atlas-accent"
        checked={checked}
        onChange={(evento) => onChange(evento.target.checked)}
      />
      {label}
    </label>
  );
}
