import type { PaginatedResponse } from "./types";

/**
 * Recorre TODAS las páginas de un listado paginado y junta sus filas.
 *
 * Existe porque varias pantallas pedían `page: 1, limit: 100` y presentaban lo que volvía como si
 * fuera el total: en TEST el catálogo tiene 320 tablas y 809 rutas, así que «Tablas con PII» o
 * «Pendientes de revisión» contaban sólo la primera página y el número salía más bajo de lo real
 * sin avisar. Un resumen que cuenta un tercio no es un resumen.
 *
 * El tope de páginas impide que un `totalPages` absurdo deje la pantalla pidiendo sin fin; si se
 * alcanza, `truncated` lo dice para que la pantalla no afirme un total que no leyó.
 */
export type AllPages<T> = {
  items: T[];
  total: number;
  truncated: boolean;
};

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  options: { limit?: number; maxPages?: number } = {},
): Promise<AllPages<T>> {
  const limit = options.limit ?? 100;
  const maxPages = options.maxPages ?? 50;
  const first = await fetchPage(1, limit);
  const items = [...first.items];
  const totalPages = Math.max(1, first.meta.totalPages);
  const lastPage = Math.min(totalPages, maxPages);

  for (let page = 2; page <= lastPage; page += 1) {
    const next = await fetchPage(page, limit);
    items.push(...next.items);
    if (next.items.length === 0) break;
  }

  return {
    items,
    total: Math.max(first.meta.total, items.length),
    truncated: totalPages > maxPages,
  };
}
