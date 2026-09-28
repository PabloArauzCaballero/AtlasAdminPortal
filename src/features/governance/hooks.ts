"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllPages } from "@/shared/api/fetch-all-pages";
import { listDataEntities, listEndpoints } from "@/features/systems/services";

/**
 * El catálogo ENTERO de tablas y rutas, no la primera página.
 *
 * Gobierno de datos y el registro de datos personales cuentan sobre él («Tablas con PII»,
 * «Pendientes de revisión»). Con `limit: 100` contaban sólo las primeras cien filas de cada lista
 * y el número salía por debajo del real sin decirlo.
 */
export function useWholeCatalog(q = "") {
  return useQuery({
    queryKey: ["internal", "governance", "whole-catalog", q] as const,
    queryFn: async () => {
      const query = q ? { q } : {};
      const [entities, endpoints] = await Promise.all([
        fetchAllPages((page, limit) =>
          listDataEntities({ ...query, page, limit }),
        ),
        fetchAllPages((page, limit) =>
          listEndpoints({ ...query, page, limit }),
        ),
      ]);
      return { entities, endpoints };
    },
  });
}
