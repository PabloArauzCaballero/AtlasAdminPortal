"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAppContent, removeAppContent, saveAppContent } from "./services";
import type { AppContentUpsert } from "./types";

const KEY = ["app-content"] as const;

export function useAppContent(surface?: string) {
  return useQuery({
    queryKey: [...KEY, surface ?? "all"],
    queryFn: () => listAppContent(surface),
  });
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
