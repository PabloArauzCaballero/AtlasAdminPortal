"use client";

import { useQueries } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getEndpoint } from "./services";
import type { EndpointItem } from "./types";

/**
 * El backend expone impactos endpoint<->tabla solo como `endpointId` (sin
 * embeber ruta/metodo). Resuelve cada id contra `/systems/endpoints/:id`
 * (misma query-key que useEndpoint, asi que comparte cache) para poder
 * mostrar la ruta real en vez de un simple `#id`.
 */
export function useEndpointsByIds(endpointIds: string[]) {
  const uniqueIds = Array.from(new Set(endpointIds.filter(Boolean)));
  const results = useQueries({
    queries: uniqueIds.map((endpointId) => ({
      queryKey: queryKeys.endpoint(endpointId),
      queryFn: () => getEndpoint(endpointId),
      enabled: Boolean(endpointId),
    })),
  });

  const byId = new Map<string, EndpointItem>();
  results.forEach((result, index) => {
    const endpoint = result.data?.endpoint;
    if (endpoint) byId.set(uniqueIds[index], endpoint);
  });

  return {
    byId,
    isLoading: results.some((result) => result.isLoading),
  };
}
