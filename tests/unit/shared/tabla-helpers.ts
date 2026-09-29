import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";
import { elegirOpcion } from "./option-select-helpers";

/** El texto de las cabeceras de la tabla, en orden (sin las de acciones, que van vacías). */
export function cabeceras(): string[] {
  return within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .map((th) => (th.textContent ?? "").trim())
    .filter(Boolean);
}

/** Las filas de datos de la tabla (sin la de cabeceras). */
export function filasDeDatos(): HTMLElement[] {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1);
}

/** Escribe en el buscador (por su placeholder) y espera al debounce de `FilterBar`. */
export async function buscar(
  placeholder: RegExp | string,
  texto: string,
): Promise<void> {
  fireEvent.change(screen.getByRole("textbox", { name: placeholder }), {
    target: { value: texto },
  });
}

/** Espera a que la tabla tenga exactamente `n` filas de datos. */
export async function esperarFilas(n: number): Promise<void> {
  await waitFor(() => expect(filasDeDatos()).toHaveLength(n));
}

/** Elige una opción de un filtro por el nombre del desplegable. */
export async function filtrarPor(
  etiqueta: RegExp | string,
  valor: string,
): Promise<void> {
  await elegirOpcion(screen.getByRole("combobox", { name: etiqueta }), valor);
}

/** Lo que toda tabla homogénea de una lista debe cumplir: tabla, cabeceras, buscador y ⓘ. */
export function esTablaHomogenea(headers: string[], placeholder: RegExp): void {
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(cabeceras()).toEqual(headers);
  expect(
    screen.getByRole("textbox", { name: placeholder }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /limpiar/i })).toBeInTheDocument();
}
