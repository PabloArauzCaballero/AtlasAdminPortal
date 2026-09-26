import type { Locator, Page } from "@playwright/test";

/**
 * El selector propio del portal (`OptionSelect`), que NO es un `<select>` nativo.
 *
 * Importa porque cambia cómo se interactúa con él: las opciones sólo existen en el DOM con la lista
 * abierta, así que `selectOption` no sirve —hay que abrir, elegir y, si se quiere cerrar sin elegir,
 * pulsar Escape—. Ese trío se repetía copiado en cinco sitios de una misma prueba; cuando el
 * componente cambió de `<option>` a lista desplegable hubo que tocar 21 selectores a mano.
 *
 * Recibe el `Page` y el identificador del control, no un `Page` entero con conocimiento de la
 * pantalla: así el mismo objeto sirve en cualquier pantalla que use el componente.
 */
export class OptionSelect {
  private readonly control: Locator;

  constructor(
    private readonly page: Page,
    private readonly testId: string,
  ) {
    this.control = page.getByTestId(testId);
  }

  /** El control en sí, para que la prueba asevere sobre él si quiere. */
  get raiz(): Locator {
    return this.control;
  }

  /** La lista desplegada. Sólo tiene sentido con `abrir()` hecho. */
  get opciones(): Locator {
    return this.page.getByRole("listbox");
  }

  async abrir(): Promise<void> {
    await this.control.click();
  }

  async cerrarSinElegir(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  /** Abre y elige la opción por su valor, que es como el portal nombra sus `data-testid`. */
  async elegir(valor: string): Promise<void> {
    await this.abrir();
    await this.page.getByTestId(`${this.testId}-option-${valor}`).click();
  }
}
