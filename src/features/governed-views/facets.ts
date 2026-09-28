import type { GovernedViewFilter, GovernedViewRow } from "./types";

/**
 * Los valores de un filtro desplegable, sacados de la página cargada. Se leen del campo de la fila
 * (`field`) cuando no se llama como el filtro: en «Clientes» el filtro es `status` y la fila trae
 * `lifecycleStatus`, y leer `row.status` dejaba el desplegable siempre vacío.
 */
export function facetValues(
  items: readonly GovernedViewRow[],
  filtro: GovernedViewFilter,
): (string | null)[] {
  return items.map((row) => {
    const valor = row[filtro.field ?? filtro.name];
    return valor === null || valor === undefined ? null : String(valor);
  });
}
