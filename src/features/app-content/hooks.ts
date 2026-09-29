"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listAppContent, removeAppContent, saveAppContent } from "./services";
import type { AppContentQuery, AppContentUpsert } from "./types";

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
