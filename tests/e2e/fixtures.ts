import { test as base } from "@playwright/test";
import {
  CatalogoDeDatosPage,
  EndpointsPage,
} from "./pages/catalogo-de-datos.page";

/**
 * Los objetos de página se inyectan por FIXTURE, no se construyen en cada prueba.
 *
 * Con fixtures el tipo lo pone TypeScript, la construcción y el desmontaje ocurren solos, y —lo que
 * más importa aquí— cada prueba recibe los suyos: nada se comparte entre pruebas, así que la suite
 * puede correr en paralelo sin que el orden importe.
 */
export const test = base.extend<{
  catalogoDeDatos: CatalogoDeDatosPage;
  endpoints: EndpointsPage;
}>({
  catalogoDeDatos: async ({ page }, use) => {
    await use(new CatalogoDeDatosPage(page));
  },
  endpoints: async ({ page }, use) => {
    await use(new EndpointsPage(page));
  },
});

export { expect } from "@playwright/test";
