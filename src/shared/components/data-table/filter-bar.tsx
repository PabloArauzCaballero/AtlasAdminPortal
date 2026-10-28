"use client";

import { FilterX, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { FieldTooltip } from "@/shared/components/ui/field-tooltip";
import { Input } from "@/shared/components/ui/input";
import { OptionSelect } from "@/shared/components/ui/option-select";
import { cn } from "@/shared/lib/cn";
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
 * Espera entre la última tecla y la petición. 350 ms es lo que ya usan `loans` y el buscador global:
 * suficiente para no lanzar una consulta por carácter mientras se escribe, y aún se siente en vivo.
 */
const SEARCH_DEBOUNCE_MS = 350;

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
  // Sólo gobierna el móvil (`<lg`): en escritorio los filtros están siempre a la vista.
  const [panelOpen, setPanelOpen] = useState(false);
  const activos = filters.filter((filter) => filter.value !== "").length;
  const hayPanel = filters.length > 0;
  // El texto que se ve se actualiza al instante; la petición (`onSearchChange`) sale cuando se deja de
  // teclear. Antes cada tecla disparaba una consulta en TODAS las pantallas de listado (en el registro
  // de PII, además, eran ~13 peticiones encadenadas por tecla).
  const [draft, setDraft] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Lo último que ESTA barra mandó al padre. Si `search` cambia y no es eso, el cambio vino de fuera
  // (Limpiar, un enlace profundo, un reset de filtros): hay que adoptarlo y descartar lo pendiente.
  // Sin esta distinción, una respuesta tardía del padre pisaría lo que la persona sigue escribiendo.
  const lastSent = useRef(search);
  useEffect(() => {
    if (search !== lastSent.current) {
      lastSent.current = search;
      clearTimeout(timer.current);
      setDraft(search);
    }
  }, [search]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const writeSearch = (value: string) => {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastSent.current = value;
      onSearchChange(value);
    }, SEARCH_DEBOUNCE_MS);
  };
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-atlas-border bg-white p-3 shadow-subtle lg:flex-row lg:flex-wrap lg:items-center">
      {/*
       * En móvil la fila es «buscador + Filtros»: el buscador sigue siempre a mano y los filtros
       * se despliegan a demanda. Apilados ocupaban ~430 px antes de la primera fila de datos en
       * 375 px. `lg:contents` hace que, en escritorio, los hijos de esta fila participen
       * directamente en la fila de la barra, igual que antes de existir el botón.
       */}
      <div className="flex items-center gap-2 lg:contents">
        {/* El buscador conserva un ancho mínimo: con seis filtros la fila envuelve en vez de aplastarlo. */}
        <div className="relative min-w-0 flex-1 lg:min-w-[14rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" />
          <Input
            className={searchTooltip ? "pl-9 pr-10" : "pl-9"}
            value={draft}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-describedby={searchTooltip ? `${uid}-buscador` : undefined}
            onChange={(event) => writeSearch(event.target.value)}
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
        {hayPanel ? (
          <Button
            className="atlas-tap relative lg:hidden"
            aria-expanded={panelOpen}
            aria-controls={`${uid}-filtros`}
            aria-label={activos > 0 ? `Filtros: ${activos} activos` : "Filtros"}
            onClick={() => setPanelOpen((abierto) => !abierto)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filtros
            {activos > 0 ? (
              <span
                aria-hidden="true"
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-atlas-accent px-1 text-[11px] font-bold text-white"
              >
                {activos}
              </span>
            ) : null}
          </Button>
        ) : null}
      </div>
      <div
        id={`${uid}-filtros`}
        className={cn(
          "flex-col gap-3 lg:contents",
          // Plegado en móvil; en escritorio `contents` lo ignora y siempre se ven.
          hayPanel && !panelOpen ? "hidden" : "flex",
        )}
      >
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
    </div>
  );
}
