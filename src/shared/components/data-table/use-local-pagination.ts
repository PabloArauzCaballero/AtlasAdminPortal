"use client";

import { useEffect, useState } from "react";
import type { PaginationMeta } from "@/shared/api/types";
import { usePageSize } from "@/shared/lib/page-size";

/** Tamaño de página de las tablas que llegan enteras: más que eso ya no cabe de un vistazo. */
export const LOCAL_PAGE_SIZE = 25;

/**
 * La paginación de una tabla cuyos datos ya están todos en pantalla.
 *
 * Las tablas paginadas en el servidor traen su `meta`; las demás (catálogos cerrados, fichas,
 * resultados que el cliente filtra) llegaban enteras y se pintaban enteras, sin pie de página.
 * Ahora `DataTable` las parte aquí con los mismos controles. Con pocas filas no estorba: si caben
 * en una página, no hay pie.
 */
export function useLocalPagination(total: number, enabled: boolean) {
  const limit = usePageSize(LOCAL_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const current = Math.min(page, totalPages);

  // Filtrar deja menos filas: volver a una página que ya no existe pintaba una tabla vacía.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const meta: PaginationMeta | undefined =
    enabled && total > Math.min(limit, LOCAL_PAGE_SIZE)
      ? { page: current, limit, total, totalPages }
      : undefined;
  return { meta, page: current, limit, setPage };
}
