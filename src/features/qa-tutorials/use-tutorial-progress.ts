"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/auth/auth-context";
import { fetchRemoteProgress, saveRemoteProgress } from "./progress-remote";
import { readProgressCache, writeProgressCache } from "./progress-storage";
import type { TutorialProgress, TutorialStatus } from "./types";

/**
 * Progreso del usuario con backend como fuente de verdad y una caché local del
 * navegador como aceleración: se pinta la caché al instante (`initialData`) y
 * se reconcilia con el servidor; si el servidor falla, se sigue mostrando la
 * caché.
 */
export function useTutorialProgress() {
  const { user } = useAuth();
  const userId = user?.id ?? "anonymous";
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["qa-tutorial-progress", userId], [userId]);

  const query = useQuery({
    queryKey,
    initialData: () => readProgressCache(userId),
    queryFn: async () => {
      const items = await fetchRemoteProgress(userId);
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
    onError: (_error, _progress, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        writeProgressCache(userId, context.previous);
      }
    },
    onSuccess: (items) => {
      queryClient.setQueryData(queryKey, items);
      writeProgressCache(userId, items);
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

function mergeOne(
  items: TutorialProgress[],
  progress: TutorialProgress,
): TutorialProgress[] {
  const rest = items.filter((item) => item.tutorialId !== progress.tutorialId);
  return [...rest, progress];
}
