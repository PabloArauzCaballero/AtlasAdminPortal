"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { normalizeForSearch, type Option } from "@/shared/lib/options";
import { Portal } from "./portal";

/** A partir de cuántas opciones aparece el buscador dentro de la lista. */
export const SEARCH_FROM = 8;

export type ListRect = {
  top: number;
  bottom: number;
  left: number;
  width: number;
};

/** Filtra por etiqueta Y por descripción, sin tildes: «facturacion» encuentra «Facturación». */
export function filterOptions(options: Option[], term: string): Option[] {
  const needle = normalizeForSearch(term);
  if (!needle) return options;
  return options.filter((option) =>
    normalizeForSearch(`${option.label} ${option.description ?? ""}`).includes(
      needle,
    ),
  );
}

/**
 * La lista desplegada del `OptionSelect`: buscador (con más de ocho opciones) y filas.
 *
 * Vive en un `Portal` con posición fija porque casi todo en el portal recorta: el cuerpo de una
 * tabla es `overflow-auto`, los cajones y el lienzo de flujos son `overflow-hidden`. En posición
 * absoluta la lista se cortaría en el borde de la fila.
 *
 * Cada fila enseña SIEMPRE su descripción («qué significa y cuándo elegirla») en segunda línea:
 * eso es lo que un `<option>` nativo no sabe hacer, porque su `title` ni se pinta en Safari ni lo
 * lee el lector de pantalla. Si la descripción se recorta a dos líneas, el `title` de la fila la
 * da entera al pasar el ratón.
 */
export function OptionSelectList({
  listId,
  labelledBy,
  testId,
  options,
  value,
  activeIndex,
  rect,
  searchable,
  onSearch,
  onActivate,
  onChoose,
  onKeyDown,
  listRef,
}: Readonly<{
  listId: string;
  labelledBy: string;
  /** Raíz de los `data-testid` de las filas: `<testId>-option-<value>`. */
  testId: string;
  options: Option[];
  value: string;
  activeIndex: number;
  rect: ListRect | null;
  searchable: boolean;
  onSearch: (term: string) => void;
  onActivate: (index: number) => void;
  onChoose: (option: Option) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
}>) {
  const [term, setTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchable) searchRef.current?.focus();
  }, [searchable]);

  const activeId =
    activeIndex >= 0 && activeIndex < options.length
      ? `${listId}-${activeIndex}`
      : undefined;

  const position = useMemo(() => {
    if (!rect) return { top: -9999, left: -9999, width: 240 };
    const hueco = window.innerHeight - rect.bottom;
    const arriba = hueco < 240 && rect.top > hueco;
    return arriba
      ? {
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
        }
      : { top: rect.bottom + 4, left: rect.left, width: rect.width };
  }, [rect]);

  return (
    <Portal>
      {/* El teclado lo maneja el botón; aquí sólo se reenvía lo que se teclea en el buscador. */}
      <div
        data-option-popup={listId}
        style={{ position: "fixed", ...position }}
        className="z-[90] min-w-[12rem] overflow-hidden rounded-xl border border-atlas-border bg-white shadow-lg"
        onKeyDown={onKeyDown}
        role="presentation"
      >
        {searchable ? (
          <div className="border-b border-atlas-border p-2">
            <input
              ref={searchRef}
              type="search"
              aria-label="Buscar una opción"
              aria-controls={listId}
              aria-activedescendant={activeId}
              placeholder="Escribe para filtrar…"
              className="h-8 w-full rounded-lg border border-slate-300 px-2 text-sm text-atlas-text outline-none focus:border-atlas-accent"
              onChange={(event) => {
                setTerm(event.target.value);
                onSearch(event.target.value);
              }}
              value={term}
            />
          </div>
        ) : null}
        {/*
         * `div` y no `ul`/`li`, a propósito: `no-noninteractive-element-to-interactive-role` está
         * como ERROR sin opciones en este repo, así que un `<ul role="listbox">` no pasa el lint
         * aunque sea el marcado canónico de un combobox. Con `div` el papel lo da el `role` y la
         * semántica que llega al lector de pantalla es exactamente la misma.
         */}
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className="max-h-72 overflow-y-auto py-1"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-atlas-muted">
              Ninguna opción coincide.
            </p>
          ) : (
            options.map((option, index) => (
              <OptionRow
                key={option.value || `vacia-${index}`}
                id={`${listId}-${index}`}
                testId={`${testId}-option-${option.value}`}
                option={option}
                index={index}
                selected={option.value === value}
                active={index === activeIndex}
                onActivate={onActivate}
                onChoose={onChoose}
              />
            ))
          )}
        </div>
      </div>
    </Portal>
  );
}

function OptionRow({
  id,
  testId,
  option,
  index,
  selected,
  active,
  onActivate,
  onChoose,
}: Readonly<{
  id: string;
  testId: string;
  option: Option;
  index: number;
  selected: boolean;
  active: boolean;
  onActivate: (index: number) => void;
  onChoose: (option: Option) => void;
}>) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={option.disabled}
      data-index={index}
      data-testid={testId}
      title={option.description}
      tabIndex={-1}
      className={cn(
        "cursor-pointer px-3 py-2",
        active && "bg-atlas-accent/10",
        selected && "font-semibold text-atlas-accent",
        option.disabled && "cursor-not-allowed opacity-50",
      )}
      onMouseEnter={() => onActivate(index)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onChoose(option)}
      onKeyDown={() => {}}
    >
      <span className="block text-sm leading-tight">{option.label || " "}</span>
      {option.description ? (
        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-atlas-muted">
          {option.description}
        </span>
      ) : null}
    </div>
  );
}
