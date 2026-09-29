"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import type { Option } from "@/shared/lib/options";

export type LocalListFilter<T> = {
  name: string;
  label: string;
  /** Qué acota este filtro y por qué importa. Es obligatorio: sin ⓘ un filtro no se entiende. */
  tooltip: string;
  options: Option[];
  /** ¿La fila pasa el filtro cuando se elige `value`? */
  test: (row: T, value: string) => boolean;
};

/** Minúsculas y sin tildes: «Aprobacion» encuentra «aprobación». */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

/**
 * La tabla de un catálogo CERRADO que el servidor devuelve ENTERO por diseño (las comprobaciones
 * de una compuerta, los bloques de la red, los proveedores…).
 *
 * Lleva el mismo `FilterBar` + `DataTable` que las listas paginadas en el servidor, para que
 * todas las pantallas se lean igual. La diferencia es honesta y va en el tooltip del buscador
 * (`searchTooltip`): aquí el buscador recorre la lista completa, que ya está en pantalla. Una
 * colección que el servidor recorta o pagina NO va aquí: su buscador y sus filtros viajan al
 * servidor.
 */
export function LocalListTable<T>({
  rows,
  columns,
  searchText,
  searchPlaceholder,
  searchTooltip,
  filters = [],
  emptyTitle,
  emptyFilteredTitle,
  emptyDescription,
  showFilterBar = true,
}: Readonly<{
  rows: T[];
  columns: ColumnDef<T>[];
  /** Los campos por los que busca el buscador, juntos en un texto. */
  searchText: (row: T) => string;
  searchPlaceholder: string;
  searchTooltip: string;
  filters?: LocalListFilter<T>[];
  emptyTitle: string;
  emptyFilteredTitle: string;
  emptyDescription?: string;
  showFilterBar?: boolean;
}>) {
  const [q, setQ] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const visible = useMemo(() => {
    const needle = normalizeSearch(q);
    return rows.filter((row) => {
      if (needle && !normalizeSearch(searchText(row)).includes(needle))
        return false;
      return filters.every((filter) => {
        const value = values[filter.name];
        return !value || filter.test(row, value);
      });
    });
  }, [rows, q, values, filters, searchText]);

  return (
    <>
      {showFilterBar ? (
        <FilterBar
          search={q}
          searchPlaceholder={searchPlaceholder}
          searchTooltip={searchTooltip}
          onSearchChange={setQ}
          onFilterChange={(name, value) =>
            setValues((current) => ({ ...current, [name]: value }))
          }
          onClear={() => {
            setQ("");
            setValues({});
          }}
          filters={filters.map((filter) => ({
            name: filter.name,
            label: filter.label,
            tooltip: filter.tooltip,
            options: filter.options,
            value: values[filter.name] ?? "",
          }))}
        />
      ) : null}
      <DataTable
        data={visible}
        columns={columns}
        emptyTitle={rows.length === 0 ? emptyTitle : emptyFilteredTitle}
        emptyDescription={
          rows.length === 0
            ? emptyDescription
            : "Quita el texto o los filtros para volver a ver todas las filas."
        }
      />
    </>
  );
}
