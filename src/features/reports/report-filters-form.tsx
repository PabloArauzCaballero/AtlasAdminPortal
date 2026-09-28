"use client";

import { Field, Input, Select } from "@/shared/components/ui/input";
import type { ReportFilter } from "./types";

export type ReportFilterValues = Record<string, string>;

/**
 * Los filtros del informe, dibujados a partir de su propia definición (`report.filters`).
 *
 * Antes era un cuadro de texto donde había que escribir JSON a mano: la persona tenía que adivinar
 * las claves (`sensitivityLevel`, `from`…) y un error de comillas era «El JSON de filtros no es
 * válido». Ahora cada filtro declarado es un campo con su etiqueta, y sólo esos se envían.
 */
export function ReportFiltersForm({
  filters,
  values,
  onChange,
}: Readonly<{
  filters: ReportFilter[];
  values: ReportFilterValues;
  onChange: (key: string, value: string) => void;
}>) {
  if (filters.length === 0) {
    return (
      <p className="text-sm text-atlas-muted">
        Este informe no tiene filtros: se calcula sobre todos los datos.
      </p>
    );
  }
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {filters.map((filter) => (
        <Field
          key={filter.key}
          label={filter.label}
          tooltip={tooltipFor(filter)}
        >
          {filter.filterType === "select" && filter.options?.length ? (
            <Select
              name={`filtro-${filter.key}`}
              value={values[filter.key] ?? ""}
              placeholder="Todos"
              onChange={(value) => onChange(filter.key, value)}
              options={[
                {
                  value: "",
                  label: "Todos",
                  description: "No filtra por este campo.",
                },
                // sin-ayuda: los valores vienen de la definición del informe en el backend, sin texto propio
                ...filter.options.map((option) => ({
                  value: String(option),
                  label: String(option),
                })),
              ]}
            />
          ) : (
            <Input
              type={filter.filterType === "date" ? "date" : "text"}
              value={values[filter.key] ?? ""}
              onChange={(event) => onChange(filter.key, event.target.value)}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

function tooltipFor(filter: ReportFilter): string {
  if (filter.filterType === "date")
    return `${filter.label}: fecha del periodo que se cuenta. Vacío no limita.`;
  if (filter.filterType === "select")
    return `${filter.label}: deja «Todos» para no filtrar.`;
  return `${filter.label}: vacío no filtra.`;
}

/** Sólo los filtros con valor: uno vacío no se manda como si fuera un criterio. */
export function filledFilters(
  values: ReportFilterValues,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.trim() !== ""),
  );
}
