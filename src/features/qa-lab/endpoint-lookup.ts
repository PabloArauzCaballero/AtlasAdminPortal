"use client";

import { useEndpoint, useEndpointsByIds } from "@/features/systems/hooks";
import type { EndpointItem } from "@/features/systems/types";
import {
  getMockProviderEndpoint,
  isMockEndpointId,
} from "./mock-provider-endpoints";

/**
 * Envuelve `useEndpoint` para que un `endpointId` del mock de proveedores externos
 * (`mock:segip-identity-verify`, …) resuelva contra el catálogo LOCAL en vez de pegarle a
 * `GET /systems/endpoints/:id` de AtlasBackend, que nunca lo va a tener — no es un endpoint del
 * catálogo, es un endpoint del emulador. El hook real de `systems` sigue llamándose siempre (las
 * reglas de hooks no permiten condicionarlo), pero con un id vacío para que `enabled: false` no
 * dispare la petición.
 */
export function useLabEndpoint(endpointId: string) {
  const mock = isMockEndpointId(endpointId);
  const real = useEndpoint(mock ? "" : endpointId);
  if (!mock) return real;
  const endpoint = getMockProviderEndpoint(endpointId);
  return {
    ...real,
    data: endpoint
      ? {
          endpoint,
          toolRequirements: [],
          dataEntityImpacts: [],
          fieldImpacts: [],
        }
      : undefined,
    isLoading: false,
    isPending: false,
    error: null,
    refetch: async () => real,
  };
}

/** Misma idea que `useLabEndpoint`, para el lote que usa el Journey Runner. */
export function useLabEndpointsByIds(endpointIds: string[]) {
  const mockIds = endpointIds.filter(isMockEndpointId);
  const realIds = endpointIds.filter((id) => !isMockEndpointId(id));
  const real = useEndpointsByIds(realIds);
  if (mockIds.length === 0) return real;
  const byId = new Map<string, EndpointItem>(real.byId);
  for (const id of mockIds) {
    const endpoint = getMockProviderEndpoint(id);
    if (endpoint) byId.set(id, endpoint);
  }
  return { byId, isLoading: real.isLoading };
}
