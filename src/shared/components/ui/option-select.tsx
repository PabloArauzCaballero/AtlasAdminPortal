"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/shared/lib/cn";
import type { Option } from "@/shared/lib/options";
import { joinIds, useFieldContext } from "./field-context";
import { handleSelectKey } from "./option-select-keys";
import {
  filterOptions,
  OptionSelectList,
  SEARCH_FROM,
  type ListRect,
} from "./option-select-list";

export type OptionSelectProps = {
  /** Nombre del control oculto que lleva el valor al formulario. */
  name: string;
  options: Option[];
  /** `id` del botón; por defecto el del `<Field>` que lo envuelve. */
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Texto cuando el catálogo llega vacío. */
  emptyLabel?: string;
  /** Nombre accesible cuando no hay etiqueta visible (barras de filtros, celdas de tabla). */
  ariaLabel?: string;
  describedById?: string;
  /** `data-testid` del botón; por defecto `select-<name>`. */
  testId?: string;
  className?: string;
  /** Reducido, para las barras de filtros: no repite la descripción bajo el control. */
  compact?: boolean;
};

/**
 * Un select en el que cada opción dice qué significa.
 *
 * Un `<option>` nativo no admite explicación propia: su `title` no se pinta en Safari/macOS ni en
 * el móvil y ningún lector de pantalla lo anuncia, así que una lista de estados o de tipos era una
 * lista de palabras a adivinar («PENDING», «SOFT», «BLOCKED»). Aquí cada fila lleva su
 * `description` a la vista en segunda línea y la elegida la repite bajo el campo.
 *
 * Es un combobox ARIA (botón + `listbox`) con teclado completo: flechas, Inicio/Fin, escribir para
 * saltar a una opción, Enter/Espacio para elegir, Escape para cerrar devolviendo el foco, Tab para
 * salir. Con más de ocho opciones aparece un buscador que filtra por etiqueta y por descripción,
 * sin tildes.
 *
 * El valor viaja en un `<input className="sr-only">` y NO en un `type="hidden"`: el navegador no
 * valida `required` sobre un oculto, así que un formulario incompleto se enviaba igual. Al elegir
 * se dispara `input`/`change` NATIVOS sobre ese control (con el setter del prototipo) para que el
 * `onChange` del `<form>` de React se entere exactamente igual que con un `<select>`.
 */
export function OptionSelect(props: OptionSelectProps) {
  const field = useFieldContext();
  const generated = useId();
  const id = props.id ?? field?.id ?? generated;
  const listId = `${id}-lista`;
  const testId = props.testId ?? `select-${props.name}`;

  const controlled = props.value !== undefined;
  const [internal, setInternal] = useState(props.defaultValue ?? "");
  const value = controlled ? (props.value ?? "") : internal;

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<ListRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const empty = props.options.length === 0;
  const searchable = props.options.length > SEARCH_FROM;
  const selected = props.options.find((option) => option.value === value);
  const visible = useMemo(
    () => filterOptions(props.options, term),
    [props.options, term],
  );

  const commit = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      const hidden = hiddenRef.current;
      if (hidden && hidden.value !== next) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(hidden, next);
        hidden.dispatchEvent(new Event("input", { bubbles: true }));
        hidden.dispatchEvent(new Event("change", { bubbles: true }));
      }
      props.onChange?.(next);
    },
    [controlled, props],
  );

  const place = useCallback(() => {
    const box = buttonRef.current?.getBoundingClientRect();
    if (box)
      setRect({
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        width: box.width,
      });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      // La lista vive en un portal: no basta con mirar dentro del componente. El buscador es
      // hermano del listbox, así que se marca TODO el desplegable con `data-option-popup`.
      if ((target as HTMLElement).closest?.(`[data-option-popup="${listId}"]`))
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, listId]);

  useEffect(() => {
    if (!open) return;
    const index = visible.findIndex((option) => option.value === value);
    setActive(index >= 0 ? index : 0);
    // Sólo al abrir: después manda el teclado, no el valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    setTerm("");
    if (refocus) buttonRef.current?.focus();
  };

  const choose = (option: Option | undefined) => {
    if (!option || option.disabled) return;
    commit(option.value);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) =>
    handleSelectKey(event, {
      open,
      disabled: Boolean(props.disabled),
      empty,
      searchable,
      options: visible,
      activeIndex: active,
      typed,
      setOpen,
      setActive,
      choose,
      close,
    });

  const describedBy = joinIds(props.describedById ?? field?.describedBy);
  const activeId = open && visible[active] ? `${listId}-${active}` : undefined;

  return (
    <span className="relative block min-w-0">
      <input
        ref={hiddenRef}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        name={props.name}
        value={value}
        required={props.required}
        disabled={props.disabled}
        onChange={() => {}}
      />
      <button
        ref={buttonRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
        aria-describedby={describedBy}
        aria-label={props.ariaLabel}
        aria-required={props.required}
        data-testid={testId}
        data-value={value}
        disabled={props.disabled || empty}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm text-atlas-text shadow-subtle transition-[border-color,box-shadow] hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100",
          props.compact ? "h-9" : "h-10",
          props.className,
        )}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onKeyDown}
        onFocus={() => {
          field?.onFocus?.();
          props.onFocus?.();
        }}
        onBlur={() => {
          field?.onBlur?.();
          props.onBlur?.();
        }}
      >
        <span className={cn("truncate", !selected && "text-slate-500")}>
          {empty
            ? (props.emptyLabel ?? "— No hay datos registrados —")
            : (selected?.label ?? props.placeholder ?? "Elige una opción")}
        </span>
        {open ? (
          <ChevronUp
            className="h-4 w-4 shrink-0 text-atlas-muted"
            aria-hidden
          />
        ) : (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-atlas-muted"
            aria-hidden
          />
        )}
      </button>
      {selected?.description && !props.compact ? (
        <span
          className="mt-1 block text-xs text-atlas-muted"
          data-testid={`${testId}-descripcion`}
        >
          {selected.description}
        </span>
      ) : null}
      {open ? (
        <OptionSelectList
          listId={listId}
          labelledBy={id}
          testId={testId}
          options={visible}
          value={value}
          activeIndex={active}
          rect={rect}
          searchable={searchable}
          onSearch={(next) => {
            setTerm(next);
            setActive(0);
          }}
          onActivate={setActive}
          onChoose={choose}
          onKeyDown={onKeyDown}
          listRef={listRef}
        />
      ) : null}
    </span>
  );
}
