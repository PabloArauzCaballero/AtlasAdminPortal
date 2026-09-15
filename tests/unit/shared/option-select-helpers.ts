import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Elegir en un `OptionSelect` como lo hace una persona: abrir y pulsar la fila.
 *
 * Sustituye a `userEvent.selectOptions(select, valor)`, que sólo sirve para un `<select>` nativo.
 * La fila se localiza por su `data-value`, así que el valor vacío («sin filtrar») también vale.
 */
export async function elegirOpcion(
  combobox: HTMLElement,
  valor: string,
): Promise<void> {
  await userEvent.click(combobox);
  const lista = await screen.findByRole("listbox");
  const fila = within(lista)
    .getAllByRole("option")
    .find((opcion) => opcion.getAttribute("data-value") === valor);
  if (!fila) throw new Error(`No hay ninguna opción con valor «${valor}»`);
  await userEvent.click(fila);
}

/** Los valores que ofrece un `OptionSelect`, en orden; abre la lista y la vuelve a cerrar. */
export async function valoresDeOpciones(
  combobox: HTMLElement,
): Promise<string[]> {
  await userEvent.click(combobox);
  const lista = await screen.findByRole("listbox");
  const valores = within(lista)
    .getAllByRole("option")
    .map((opcion) => opcion.getAttribute("data-value") ?? "");
  await userEvent.keyboard("{Escape}");
  return valores;
}
