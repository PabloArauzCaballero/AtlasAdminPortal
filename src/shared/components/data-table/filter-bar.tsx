"use client";

import { FilterX, Search } from "lucide-react";
import { useId } from "react";
import { Button } from "@/shared/components/ui/button";
import { FieldTooltip } from "@/shared/components/ui/field-tooltip";
import { Input } from "@/shared/components/ui/input";
import { OptionSelect } from "@/shared/components/ui/option-select";
import type { Option } from "@/shared/lib/options";

export type FilterOption = {
  name: string;
  label: string;
  value: string;
  options: Option[];
  /** Qué acota este filtro y por qué importa. Pinta el ⓘ junto al desplegable. */
  tooltip?: string;
  /** Etiqueta de la fila que quita el filtro. Por defecto, la del filtro. */
  allLabel?: string;
};

/**
 * La barra de búsqueda y filtros de una tabla.
 *
 * Cada filtro es un `OptionSelect`, no un `<select>` nativo: las opciones de un filtro son casi
 * siempre códigos del dominio («SOFT», «PARTIAL», «kyc_document_unreadable») y en un `<option>` no
 * cabe explicarlos. Aquí cada fila lleva su descripción debajo del nombre.
 *
 * El ⓘ va al lado del desplegable y no dentro de una etiqueta: el nombre accesible del filtro lo
 * sigue dando su `aria-label`, así que los `getByLabel('Estado')` de las pruebas siguen apuntando
 * al control y no al botón de ayuda.
 */
export function FilterBar({
  search,
  searchPlaceholder = "Buscar…",
  searchTooltip,
  filters = [],
  onSearchChange,
  onFilterChange,
  onClear,
}: Readonly<{
  search: string;
  searchPlaceholder?: string;
  /** Qué busca el buscador (por qué columnas). */
  searchTooltip?: string;
  filters?: FilterOption[];
  onSearchChange: (value: string) => void;
  onFilterChange?: (name: string, value: string) => void;
  onClear?: () => void;
}>) {
  const uid = useId();
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-atlas-border bg-white p-3 shadow-subtle lg:flex-row lg:flex-wrap lg:items-center">
      {/* El buscador conserva un ancho mínimo: con seis filtros la fila envuelve en vez de aplastarlo. */}
      <div className="relative min-w-0 flex-1 lg:min-w-[14rem]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" />
        <Input
          className="pl-9"
          value={search}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          aria-describedby={searchTooltip ? `${uid}-buscador` : undefined}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {searchTooltip ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            <FieldTooltip
              label={searchPlaceholder}
              text={searchTooltip}
              describedById={`${uid}-buscador`}
            />
          </span>
        ) : null}
      </div>
      {filters.map((filter) => (
        <span key={filter.name} className="flex items-center gap-1">
          <OptionSelect
            compact
            className="lg:w-48"
            name={filter.name}
            ariaLabel={filter.label}
            placeholder={filter.label}
            describedById={
              filter.tooltip ? `${uid}-${filter.name}-ayuda` : undefined
            }
            value={filter.value}
            options={[
              {
                value: "",
                label: filter.allLabel ?? filter.label,
                description: `Sin filtrar: enseña todas las filas, cualquiera que sea ${filter.label.toLocaleLowerCase("es")}.`,
              },
              ...filter.options,
            ]}
            onChange={(value) => onFilterChange?.(filter.name, value)}
          />
          {filter.tooltip ? (
            <FieldTooltip
              label={filter.label}
              text={filter.tooltip}
              describedById={`${uid}-${filter.name}-ayuda`}
            />
          ) : null}
        </span>
      ))}
      {onClear ? (
        <Button onClick={onClear}>
          <FilterX className="h-4 w-4" aria-hidden />
          Limpiar
        </Button>
      ) : null}
    </div>
  );
}
