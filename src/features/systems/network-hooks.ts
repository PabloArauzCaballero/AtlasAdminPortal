"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import {
  federateBlocks,
  getNetworkHealth,
  listActiveDecisionArtifacts,
  listBlocks,
} from "./services";

/**
 * Los bloques del ecosistema. Se cachean largo a propósito: la lista es de tres elementos y sus
 * contadores sólo cambian cuando alguien refedera, así que refrescarla en cada montaje sólo añade
 * peticiones a una pantalla que se abre continuamente.
 */
export function usePlatformBlocks() {
  return useQuery({
    queryKey: queryKeys.platformBlocks,
    queryFn: listBlocks,
    staleTime: 60_000,
  });
}

/**
 * Salud de la RED. Se refresca sola cada 30 s, igual que la salud de herramientas: es una pantalla
 * que se deja abierta durante un incidente, y un estado congelado ahí es peor que no tenerla.
 */
export function useNetworkHealth() {
  return useQuery({
    queryKey: queryKeys.networkHealth,
    queryFn: getNetworkHealth,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useFederateBlocksMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: federateBlocks,
    onSuccess: async () => {
      // Refederar cambia el catálogo entero, no sólo el panel: sin invalidar estas tres claves, el
      // operador ve «federación correcta» y una tabla que sigue enseñando lo de antes.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.networkHealth }),
        queryClient.invalidateQueries({ queryKey: queryKeys.platformBlocks }),
        queryClient.invalidateQueries({
          queryKey: ["systems", "data-entities"],
        }),
        queryClient.invalidateQueries({ queryKey: ["systems", "endpoints"] }),
      ]);
    },
  });
}

export function useActiveDecisionArtifacts() {
  return useQuery({
    queryKey: queryKeys.decisionArtifacts,
    queryFn: listActiveDecisionArtifacts,
    refetchInterval: 60_000,
  });
}
