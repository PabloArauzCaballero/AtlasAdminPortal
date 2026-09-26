import type { Page } from "@playwright/test";

/**
 * Lo mínimo común a toda pantalla del portal: saber a qué ruta va y cómo llegar.
 *
 * Deliberadamente pobre. Una jerarquía de página profunda termina siendo un archivo que todas las
 * pruebas importan y que nadie puede refactorizar; aquí las pantallas COMPONEN objetos de
 * componente (tabla, selector, diálogo) en vez de heredar de cinco niveles.
 *
 * **Ningún método de un objeto de página hace aserciones.** Devuelven localizadores y estado; el
 * `expect` vive en la prueba. Si la aserción viviera aquí, al fallar la traza apuntaría al objeto de
 * página y no al escenario que se estaba comprobando, que es lo único que interesa saber.
 */
export abstract class PaginaBase {
  constructor(protected readonly page: Page) {}

  abstract readonly ruta: string;

  async ir(): Promise<void> {
    await this.page.goto(this.ruta);
  }
}
