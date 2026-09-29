"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "./data-table";
import { FilterBar } from "./filter-bar";

/** Desde cuántas filas un cuadro de una ficha ofrece buscador: con tres filas sobra, con veinte no. */
export const SECTION_TABLE_SEARCH_FROM = 8;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Un cuadro de registros DENTRO de una ficha (contactos de un cliente, factores de una evaluación,
 * alias de un ítem): el mismo `DataTable` que las listas de pantalla, con su título y su contador.
 *
 * Estas colecciones no se paginan en el servidor porque no son una lista aparte: viajan enteras
 * dentro de la respuesta de la ficha y las acota su propietario (un cliente tiene unos pocos
 * contactos; una evaluación, unos pocos factores). Por eso el buscador —que sólo aparece cuando la
 * colección es larga— recorre TODAS las filas y su ayuda lo dice.
 */
export function SectionTable<T>({
  title,
  description,
  data,
  columns,
  searchText,
  searchPlaceholder = "Buscar en esta tabla…",
  searchTooltip,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  title: string;
  description?: string;
  data: T[];
  columns: ColumnDef<T>[];
  /** El texto de cada fila sobre el que busca el buscador. Sin él, el cuadro no ofrece búsqueda. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  searchTooltip?: string;
  emptyTitle: string;
  emptyDescription: string;
}>) {
  const [q, setQ] = useState("");
  const conBuscador =
    Boolean(searchText) && data.length >= SECTION_TABLE_SEARCH_FROM;
  const visibles = useMemo(() => {
    const buscado = normalizar(q.trim());
    if (!searchText || !buscado) return data;
    return data.filter((fila) =>
      normalizar(searchText(fila)).includes(buscado),
    );
  }, [data, q, searchText]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-atlas-text">{`${title} (${data.length})`}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-atlas-muted">{description}</p>
        ) : null}
      </div>
      {conBuscador ? (
        <FilterBar
          search={q}
          searchPlaceholder={searchPlaceholder}
          searchTooltip={searchTooltip}
          onSearchChange={setQ}
          onClear={() => setQ("")}
        />
      ) : null}
      <DataTable
        data={visibles}
        columns={columns}
        emptyTitle={
          data.length === 0
            ? emptyTitle
            : "Ninguna fila coincide con la búsqueda."
        }
        emptyDescription={
          data.length === 0
            ? emptyDescription
            : "Cambia o borra el texto buscado."
        }
      />
    </section>
  );
}
