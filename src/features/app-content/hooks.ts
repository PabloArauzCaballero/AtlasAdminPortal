"use client";

import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listAppContent, removeAppContent, saveAppContent } from "./services";
import type {
  AppContentQuery,
  AppContentUpsert,
  ContentSurface,
} from "./types";

const KEY = ["app-content"] as const;

export function useAppContent(surface?: string, query: AppContentQuery = {}) {
  return useQuery({
    queryKey: [...KEY, surface ?? "all", query],
    queryFn: () => listAppContent(surface, query),
    // Cambiar de página o de filtro no vacía la tabla: se ve la anterior hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });
}

/**
 * Lo que el celular enseña como PUBLICADO: las piezas visibles de la pantalla, aparte del listado.
 * La tabla pagina y filtra; el celular no puede depender de la página ni del buscador.
 */
export function usePublishedAppContent(surface: string) {
  return useAppContent(surface, { active: "true", limit: 100 });
}

/**
 * Cuántas piezas tiene cada pantalla, para que las pestañas enseñen sólo las que tienen algo.
 *
 * Una petición por pantalla con `limit: 1`: el servidor responde el resumen (`summary.total`) de la
 * pantalla sin filtros, que es lo único que hace falta. `undefined` = todavía no se sabe (o el
 * servidor no mandó resumen): quien lo use no debe esconder una pantalla por no saberlo.
 */
export function useSurfaceCounts(surfaces: readonly ContentSurface[]) {
  const results = useQueries({
    queries: surfaces.map((surface) => ({
      queryKey: [...KEY, surface, "count"] as const,
      queryFn: () => listAppContent(surface, { limit: 1 }),
      staleTime: 15_000,
    })),
  });
  const counts: Partial<Record<ContentSurface, number>> = {};
  surfaces.forEach((surface, index) => {
    const total = results[index]?.data?.summary?.total;
    if (typeof total === "number") counts[surface] = total;
  });
  return counts;
}

export function useSaveAppContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AppContentUpsert) => saveAppContent(body),
    onSuccess: async () => {
      // Se invalida la clave RAÍZ y no la de la superficie filtrada: guardar una pieza puede
      // cambiar su orden o desactivarla, y la lista de «todas» quedaría enseñando lo anterior.
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useRemoveAppContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => removeAppContent(contentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
