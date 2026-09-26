import type { Locator } from "@playwright/test";

/**
 * Una tabla del portal, vista como la ve quien la usa: filas con texto, no `<tbody> <tr>`.
 *
 * Recibe un `Locator` raíz y no la `Page`, que es lo que la hace reutilizable: la misma clase sirve
 * para la tabla de una tarjeta, la de un diálogo o la única de la pantalla, sin saber dónde está.
 */
export class Tabla {
  constructor(private readonly raiz: Locator) {}

  get elemento(): Locator {
    return this.raiz;
  }

  get filas(): Locator {
    return this.raiz.getByRole("row");
  }

  filaConTexto(texto: string | RegExp): Locator {
    return this.filas.filter({ hasText: texto });
  }

  /** Las celdas que muestran exactamente ese texto, en cualquier fila. */
  celdasCon(texto: string): Locator {
    return this.filas.getByText(texto, { exact: true });
  }
}
