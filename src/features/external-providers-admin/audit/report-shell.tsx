"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  Info,
} from "lucide-react";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";

/**
 * Piezas comunes de las ocho auditorías.
 *
 * Las ocho pestañas terminaban en el mismo visor de JSON, con el argumento —escrito en la propia
 * pantalla— de que «no tienen un contrato de respuesta fijo». Lo tienen: el backend las construye
 * con una forma estable, y son tablas y semáforos. Lo que no tenían era quien las escribiera.
 *
 * El JSON no desaparece: baja al final, plegado. Para depurar sigue siendo lo más útil que hay, y
 * quitarlo del todo cambiaría un problema de legibilidad por otro de ceguera.
 */

type QueryLike<T> = {
  isLoading: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
};

export function ReportShell<T>({
  query,
  title,
  explanation,
  children,
}: Readonly<{
  query: QueryLike<T>;
  title: string;
  /** Una línea: qué comprueba esta auditoría y cuándo se da por fallada. */
  explanation: string;
  children: (data: T) => React.ReactNode;
}>) {
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
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-atlas-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{explanation}</span>
      </p>
      {children(query.data)}
      <RawData value={query.data} />
    </div>
  );
}

export function RawData({ value }: Readonly<{ value: unknown }>) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className="flex items-center gap-1.5 text-sm text-atlas-muted hover:text-atlas-text"
      >
        {abierto ? (
          <ChevronDown className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden />
        )}
        {abierto ? "Ocultar datos crudos" : "Ver datos crudos"}
      </button>
      {abierto ? (
        <JsonViewer title="Respuesta del backend" value={value} />
      ) : null}
    </div>
  );
}

/**
 * Tabla mínima para los reportes. No usa `DataTable` porque estas tablas no ordenan, no filtran y
 * no paginan: son el contenido de un reporte, y montar la maquinaria entera para pintar ocho filas
 * añade peso sin añadir nada.
 */
export function SimpleTable({
  headers,
  children,
  align,
}: Readonly<{
  headers: string[];
  children: React.ReactNode;
  align?: Record<number, "right">;
}>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-atlas-border bg-white shadow-subtle">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-atlas-border bg-atlas-soft text-xs uppercase tracking-[0.08em] text-atlas-muted">
            {headers.map((header, index) => (
              <th
                key={header}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-left",
                  align?.[index] === "right" && "text-right",
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  right,
  muted,
}: Readonly<{ children: React.ReactNode; right?: boolean; muted?: boolean }>) {
  return (
    <td
      className={cn(
        "px-3 py-2 align-top",
        right && "whitespace-nowrap text-right tabular-nums",
        muted && "text-atlas-muted",
      )}
    >
      {children}
    </td>
  );
}

export function Tr({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <tr className="border-b border-atlas-border last:border-0">{children}</tr>
  );
}

/**
 * El veredicto de una compuerta, arriba y en una frase.
 *
 * Es el dato por el que se abre la pestaña, y estaba enterrado en un campo `qualityGate` a mitad
 * de un objeto de cien líneas.
 */
export function GateBanner({
  pass,
  passText,
  failText,
}: Readonly<{ pass: boolean; passText: string; failText: string }>) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-4",
        pass
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900",
      )}
    >
      {pass ? (
        <CircleCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
          aria-hidden
        />
      ) : (
        <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
      )}
      <p className="font-medium">{pass ? passText : failText}</p>
    </div>
  );
}

/** Sin hallazgos es una BUENA noticia y hay que decirlo, no dejar la tabla vacía. */
export function EmptyGood({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <CircleCheck
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
        aria-hidden
      />
      <span>{children}</span>
    </p>
  );
}
