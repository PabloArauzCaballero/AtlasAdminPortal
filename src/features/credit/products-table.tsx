"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PRODUCT_STATUS_OPTIONS } from "./credit-options";
import type { CreditProduct } from "./types";

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * El catálogo de productos con su buscador y su filtro de estado.
 *
 * `GET /operations/credit/products` devuelve el catálogo ENTERO —son unos pocos productos que el
 * negocio define, no un registro que crece con los clientes—, así que buscador y filtro recorren
 * la lista completa en el navegador y el tooltip lo dice.
 */
export function ProductsTable({
  items,
  columns,
}: Readonly<{ items: CreditProduct[]; columns: ColumnDef<CreditProduct>[] }>) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const visibles = useMemo(() => {
    const buscado = normalizar(q.trim());
    return items.filter(
      (producto) =>
        (!status || producto.status === status) &&
        (!buscado ||
          normalizar(
            `${producto.productName} ${producto.productCode} ${producto.currencyCode} ${producto.description ?? ""}`,
          ).includes(buscado)),
    );
  }, [items, q, status]);

  return (
    <>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por nombre, código, moneda o descripción…"
        searchTooltip="Recorre todo el catálogo de productos, que llega entero del servidor: coincide con parte del nombre, del código, de la moneda o de la descripción."
        filters={[
          {
            name: "status",
            label: "Estado",
            tooltip:
              "En qué punto de su vida está el producto: sólo los activos, dentro de su vigencia, se ofrecen a los clientes.",
            value: status,
            options: PRODUCT_STATUS_OPTIONS,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(_nombre, valor) => setStatus(valor)}
        onClear={() => {
          setQ("");
          setStatus("");
        }}
      />
      <DataTable
        data={visibles}
        columns={columns}
        emptyTitle={
          items.length === 0
            ? "No hay productos de crédito ofreciéndose."
            : "Ningún producto coincide con los filtros."
        }
        emptyDescription={
          items.length === 0
            ? "Crea el primero con «Nuevo producto» y actívalo cuando el negocio lo apruebe."
            : "Cambia o quita el estado o el texto buscado."
        }
      />
    </>
  );
}
