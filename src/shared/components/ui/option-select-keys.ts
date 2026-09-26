import { normalizeForSearch, type Option } from "@/shared/lib/options";

/** Lo tecleado hace un instante, para el salto por letras de un select nativo. */
export type TypeAhead = { text: string; at: number };

/** Ventana en la que dos teclas cuentan como una misma palabra (ms). */
const TYPE_AHEAD_MS = 800;

export type SelectKeyContext = {
  open: boolean;
  disabled: boolean;
  /** Sin opciones no hay nada que recorrer. */
  empty: boolean;
  /** Con buscador, las letras van al buscador y no al salto por letras. */
  searchable: boolean;
  options: Option[];
  activeIndex: number;
  typed: { current: TypeAhead };
  setOpen: (open: boolean) => void;
  setActive: (next: number | ((current: number) => number)) => void;
  choose: (option: Option | undefined) => void;
  close: (refocus?: boolean) => void;
};

/**
 * El teclado del `OptionSelect`, aparte del componente por el tope de 300 líneas por archivo.
 *
 * Es el contrato de un combobox ARIA y también lo que la gente espera de un `<select>` nativo:
 * flechas para moverse, Inicio/Fin a los extremos, escribir para saltar a una opción, Enter (y
 * Espacio cuando no hay buscador) para elegir, Escape para cerrar devolviendo el foco, Tab para
 * salir sin robárselo. Cerrado, cualquier flecha o Enter lo abre.
 */
export function handleSelectKey(
  event: React.KeyboardEvent,
  context: SelectKeyContext,
): void {
  if (context.disabled || context.empty) return;
  const { key } = event;

  if (!context.open) {
    if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter") {
      event.preventDefault();
      context.setOpen(true);
    }
    return;
  }

  const last = context.options.length - 1;
  if (key === "ArrowDown") {
    event.preventDefault();
    context.setActive((current) => Math.min(current + 1, last));
  } else if (key === "ArrowUp") {
    event.preventDefault();
    context.setActive((current) => Math.max(current - 1, 0));
  } else if (key === "Home") {
    event.preventDefault();
    context.setActive(0);
  } else if (key === "End") {
    event.preventDefault();
    context.setActive(last);
  } else if (key === "Enter" || (key === " " && !context.searchable)) {
    event.preventDefault();
    context.choose(context.options[context.activeIndex]);
  } else if (key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    context.close();
  } else if (key === "Tab") {
    context.close(false);
  } else if (!context.searchable && key.length === 1 && /\S/.test(key)) {
    const now = Date.now();
    const previous = context.typed.current;
    context.typed.current = {
      text: now - previous.at < TYPE_AHEAD_MS ? previous.text + key : key,
      at: now,
    };
    const needle = normalizeForSearch(context.typed.current.text);
    const index = context.options.findIndex((option) =>
      normalizeForSearch(option.label).startsWith(needle),
    );
    if (index >= 0) context.setActive(index);
  }
}
