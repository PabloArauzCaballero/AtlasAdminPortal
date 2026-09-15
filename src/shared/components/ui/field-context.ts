"use client";

import { createContext, useContext } from "react";

/**
 * Lo que un `<Field>` le cuenta al control que envuelve.
 *
 * La etiqueta ya NO envuelve al control: el botón de ayuda no puede vivir dentro de un `<label>`
 * sin colarse en el nombre accesible del campo, así que la asociación pasó a `htmlFor` + `id`. Para
 * que ningún sitio tenga que cablear ese `id` a mano —son 252 campos— viaja por contexto: `Input`,
 * `Textarea`, `NativeSelect` y `OptionSelect` lo toman de aquí junto con el `aria-describedby` que
 * apunta a la ayuda, al hint y al error.
 *
 * `onFocus`/`onBlur` son lo que abre la burbuja al entrar al control con el teclado: quien rellena
 * un formulario tabulando lee el «qué poner» sin ir a buscar el ⓘ con el ratón.
 */
export type FieldContextValue = {
  id: string;
  describedBy?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

export const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

/** Une varios ids para `aria-describedby`, ignorando los vacíos. */
export function joinIds(
  ...ids: Array<string | undefined | null | false>
): string | undefined {
  const list = ids.filter(Boolean) as string[];
  return list.length ? list.join(" ") : undefined;
}
