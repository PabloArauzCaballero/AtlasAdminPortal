"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import type { ContextItem } from "./catalog-version-types";

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Los items de una versión con buscador y filtro de estado.
 *
 * La ficha de la versión trae TODOS sus items en una sola respuesta (`items`), no una página, así
 * que buscador y filtro recorren la versión completa en el navegador; el tooltip lo dice.
 */
export function CatalogVersionItemsTable({
  items,
  columns,
}: Readonly<{ items: ContextItem[]; columns: ColumnDef<ContextItem>[] }>) {
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState("");
  const visibles = useMemo(() => {
    const buscado = normalizar(q.trim());
    return items.filter(
      (item) =>
        (!activo || String(item.isActive) === activo) &&
        (!buscado ||
          normalizar(
            `${item.itemCode} ${item.itemName} ${item.itemType}`,
          ).includes(buscado)),
    );
  }, [items, q, activo]);

  return (
    <>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre o tipo del item…"
        searchTooltip="Recorre TODOS los items de la versión, que llegan enteros con ella: coincide con parte del código, del nombre o del tipo."
        filters={[
          {
            name: "activo",
            label: "Activo",
            tooltip:
              "«Sí» son los items que el motor lee; «No», los que la versión trae desactivados.",
            value: activo,
            options: [
              {
                value: "true",
                label: "Activo",
                description: "Items que el motor lee de esta versión.",
              },
              {
                value: "false",
                label: "Inactivo",
                description: "Items desactivados: el motor no los lee.",
              },
            ],
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(_nombre, valor) => setActivo(valor)}
        onClear={() => {
          setQ("");
          setActivo("");
        }}
      />
      <DataTable
        data={visibles}
        columns={columns}
        emptyTitle={
          items.length === 0
            ? "Esta versión no tiene items."
            : "Ningún item coincide con los filtros."
        }
        emptyDescription={
          items.length === 0
            ? "Crea una versión nueva con items para que el motor tenga qué leer."
            : "Cambia o quita el estado o el texto buscado."
        }
      />
    </>
  );
}
