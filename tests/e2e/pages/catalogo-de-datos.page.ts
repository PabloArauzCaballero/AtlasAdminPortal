import type { Page } from "@playwright/test";
import { PaginaBase } from "./base.page";
import { OptionSelect } from "./components/option-select";
import { Tabla } from "./components/tabla";

/** Catálogo de datos: qué tablas hay en el ecosistema y de qué bloque es cada una. */
export class CatalogoDeDatosPage extends PaginaBase {
  readonly ruta = "/internal/data-catalog/tables";
  readonly filtroDeBloque: OptionSelect;
  readonly tabla: Tabla;

  constructor(page: Page) {
    super(page);
    this.filtroDeBloque = new OptionSelect(page, "select-block");
    this.tabla = new Tabla(page.getByRole("table"));
  }

  get titulo() {
    return this.page.getByRole("heading", { name: "Catálogo de datos" });
  }
}

/** Inventario de endpoints, con el mismo filtro por bloque. */
export class EndpointsPage extends PaginaBase {
  readonly ruta = "/internal/systems/endpoints";
  readonly filtroDeBloque: OptionSelect;
  readonly tabla: Tabla;

  constructor(page: Page) {
    super(page);
    this.filtroDeBloque = new OptionSelect(page, "select-block");
    this.tabla = new Tabla(page.getByRole("table"));
  }

  get titulo() {
    return this.page.getByRole("heading", { name: "Catálogo de endpoints" });
  }
}
