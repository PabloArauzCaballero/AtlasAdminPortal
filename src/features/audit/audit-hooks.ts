"use client";

import { useQuery } from "@tanstack/react-query";
import { getActionLogFilterCatalog } from "@/features/systems/log-services";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * El catálogo de filtros cambia sólo cuando aparece un módulo o un tipo de actor nuevo en la
 * bitácora: una hora de vida en caché basta y evita pedirlo en cada cambio de pestaña.
 */
export function useActionLogFilterCatalog() {
  return useQuery({
    queryKey: queryKeys.actionLogFilterCatalog,
    queryFn: getActionLogFilterCatalog,
    staleTime: 60 * 60 * 1000,
  });
}
