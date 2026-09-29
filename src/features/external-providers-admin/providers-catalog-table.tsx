"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import {
  HEALTH_OPTIONS,
  MODE_OPTIONS,
  STATUS_OPTIONS,
  yesNoOptions,
} from "./audit/audit-options";
import type { ProviderRow } from "./provider-columns";
import { modoEfectivo } from "./provider-display";

const FILTERS: LocalListFilter<ProviderRow>[] = [
  {
    name: "status",
    label: "Tipo de proveedor",
    tooltip:
      "Deja sólo los proveedores con ese estado de catálogo: activo, deshabilitado, sólo simulado o sólo sandbox.",
    options: STATUS_OPTIONS,
    test: (provider, value) => provider.status.toUpperCase() === value,
  },
  {
    name: "mode",
    label: "Cómo se le llama",
    tooltip:
      "Deja sólo los proveedores que hoy se llaman de esa manera. Cuenta el modo con el que la API ejecuta de verdad, no el guardado.",
    options: MODE_OPTIONS,
    test: (provider, value) => modoEfectivo(provider).toLowerCase() === value,
  },
  {
    name: "health",
    label: "Salud",
    tooltip:
      "Deja sólo los proveedores con esa salud en la última comprobación. «Sin medir» son los que aún no tienen ninguna.",
    options: HEALTH_OPTIONS,
    test: (provider, value) => {
      const status = (provider.health?.status ?? "UNKNOWN").toUpperCase();
      const key = ["HEALTHY", "OK"].includes(status)
        ? "UP"
        : ["UNAVAILABLE"].includes(status)
          ? "DOWN"
          : status;
      return key === value;
    },
  },
  {
    name: "costly",
    label: "Costoso",
    tooltip:
      "Separa los proveedores que cobran por consulta de los que no tienen costo.",
    options: yesNoOptions(
      "Cada consulta tiene costo: pasan por las políticas de gasto.",
      "Sus consultas no tienen costo.",
    ),
    test: (provider, value) => (value === "yes") === provider.isCostly,
  },
];

/**
 * El catálogo de proveedores con su configuración. Son pocos y el servidor los devuelve todos:
 * el buscador y los filtros recorren la lista completa.
 */
export function ProvidersCatalogTable({
  rows,
  columns,
}: Readonly<{ rows: ProviderRow[]; columns: ColumnDef<ProviderRow>[] }>) {
  return (
    <LocalListTable
      rows={rows}
      columns={columns}
      searchText={(provider) =>
        `${provider.code} ${provider.name} ${provider.category ?? ""} ${provider.description ?? ""}`
      }
      searchPlaceholder="Buscar por código, nombre, categoría o descripción…"
      searchTooltip="Recorre el catálogo completo de proveedores, que llega entero del servidor: coincide con parte del código, del nombre, de la categoría o de la descripción."
      filters={FILTERS}
      emptyTitle="No hay proveedores registrados."
      emptyFilteredTitle="Ningún proveedor coincide con la búsqueda."
    />
  );
}
