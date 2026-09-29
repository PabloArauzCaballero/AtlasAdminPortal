"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getCatalogSummary } from "./services";

/** Cifras del catálogo entero (`GET /systems/catalog/summary`), contadas en el servidor. */
export function useCatalogSummary() {
  return useQuery({
    queryKey: queryKeys.catalogSummary,
    queryFn: getCatalogSummary,
  });
}
