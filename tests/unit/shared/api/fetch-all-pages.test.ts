import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "@/shared/api/fetch-all-pages";

function pagina(page: number, totalPages: number, total: number, n: number) {
  return {
    items: Array.from({ length: n }, (_, i) => `${page}-${i}`),
    meta: { page, limit: 100, total, totalPages },
  };
}

describe("fetchAllPages — contar sobre el catálogo entero, no sobre la primera página", () => {
  it("recorre todas las páginas y junta las filas", async () => {
    const fetchPage = vi.fn(async (page: number) =>
      pagina(page, 4, 320, page < 4 ? 100 : 20),
    );

    const todo = await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(4);
    expect(todo.items).toHaveLength(320);
    expect(todo.total).toBe(320);
    expect(todo.truncated).toBe(false);
  });

  it("con una sola página no pide más", async () => {
    const fetchPage = vi.fn(async () => pagina(1, 1, 3, 3));

    const todo = await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(todo.items).toHaveLength(3);
  });

  it("si el catálogo supera el tope lo dice en vez de afirmar un total que no leyó", async () => {
    const fetchPage = vi.fn(async (page: number) =>
      pagina(page, 90, 9000, 100),
    );

    const todo = await fetchAllPages(fetchPage, { maxPages: 3 });

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(todo.truncated).toBe(true);
  });

  it("una página vacía antes de tiempo corta el recorrido", async () => {
    const fetchPage = vi.fn(async (page: number) =>
      pagina(page, 5, 500, page === 1 ? 100 : 0),
    );

    const todo = await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(todo.items).toHaveLength(100);
  });
});
