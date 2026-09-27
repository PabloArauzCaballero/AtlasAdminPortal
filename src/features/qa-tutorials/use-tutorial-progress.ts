"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/auth/auth-context";
import { fetchRemoteProgress, saveRemoteProgress } from "./progress-remote";
import { readProgressCache, writeProgressCache } from "./progress-storage";
import type { TutorialProgress, TutorialStatus } from "./types";

/**
 * Progreso del usuario. La fuente es el NAVEGADOR (almacenamiento local): la copia del servidor vive en
 * el `/tmp` del contenedor del portal y se pierde en cada despliegue, así que no puede mandar. Al
 * leer se fusionan las dos quedándose, por tutorial, con la actividad más reciente; al guardar se
 * escribe primero aquí y el servidor es un respaldo que puede fallar sin deshacer nada.
 */
export function useTutorialProgress() {
  const { user } = useAuth();
  const userId = user?.id ?? "anonymous";
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["qa-tutorial-progress", userId], [userId]);

  const query = useQuery({
    queryKey,
    // Sin usuario (pantalla de login) no hay nada que pedir al backend.
    enabled: Boolean(user),
    initialData: () => readProgressCache(userId),
    queryFn: async () => {
      const local = readProgressCache(userId);
      const remote = await fetchRemoteProgress(userId).catch(() => []);
      const items = mergeProgress(local, remote);
      writeProgressCache(userId, items);
      return items;
    },
  });

  const mutation = useMutation({
    mutationFn: (progress: TutorialProgress) =>
      saveRemoteProgress(userId, progress),
    onMutate: (progress) => {
      // Optimista: reflejamos el avance ya, sin esperar al servidor.
      const previous =
        queryClient.getQueryData<TutorialProgress[]>(queryKey) ?? [];
      const next = mergeOne(previous, progress);
      queryClient.setQueryData(queryKey, next);
      writeProgressCache(userId, next);
      return { previous };
    },
    // Si el respaldo del servidor falla, lo guardado en el navegador se queda: es la fuente.
    onSuccess: (items) => {
      const merged = mergeProgress(
        queryClient.getQueryData<TutorialProgress[]>(queryKey) ?? [],
        items,
      );
      queryClient.setQueryData(queryKey, merged);
      writeProgressCache(userId, merged);
    },
  });

  const progressMap = useMemo(() => {
    const map = new Map<string, TutorialProgress>();
    for (const item of query.data ?? []) map.set(item.tutorialId, item);
    return map;
  }, [query.data]);

  const getProgress = useCallback(
    (tutorialId: string): TutorialProgress | undefined =>
      progressMap.get(tutorialId),
    [progressMap],
  );

  const statusFor = useCallback(
    (tutorialId: string): TutorialStatus =>
      progressMap.get(tutorialId)?.status ?? "not-started",
    [progressMap],
  );

  const saveProgress = useCallback(
    (progress: TutorialProgress) => mutation.mutate(progress),
    [mutation],
  );

  return {
    userId,
    items: query.data ?? [],
    isLoading: query.isLoading,
    progressMap,
    getProgress,
    statusFor,
    saveProgress,
  };
}

function activityOf(item: TutorialProgress): string {
  return (
    item.lastActivityAt ??
    item.completedAt ??
    item.skippedAt ??
    item.startedAt ??
    ""
  );
}

/** Por tutorial, gana el registro con la actividad más reciente. */
export function mergeProgress(
  local: readonly TutorialProgress[],
  remote: readonly TutorialProgress[],
): TutorialProgress[] {
  const byId = new Map<string, TutorialProgress>();
  for (const item of [...remote, ...local]) {
    const current = byId.get(item.tutorialId);
    if (!current || activityOf(item) >= activityOf(current)) {
      byId.set(item.tutorialId, item);
    }
  }
  return [...byId.values()];
}

function mergeOne(
  items: TutorialProgress[],
  progress: TutorialProgress,
): TutorialProgress[] {
  const rest = items.filter((item) => item.tutorialId !== progress.tutorialId);
  return [...rest, progress];
}
