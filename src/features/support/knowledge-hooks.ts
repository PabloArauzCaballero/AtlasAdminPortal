"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { useAuth } from "@/shared/auth/auth-context";
import {
  createKnowledgeArticle,
  createKnowledgeVersion,
  listKnowledgeFaq,
  searchKnowledge,
  transitionKnowledgeVersion,
  type VersionAction,
} from "./knowledge-services";
import type {
  CreateArticleInput,
  CreateVersionInput,
  TrackedVersion,
} from "./knowledge-types";
import {
  readTrackedVersions,
  TOPE_VERSIONES,
  writeTrackedVersions,
} from "./knowledge-tracked-storage";

/** Un 403 no mejora reintentando: se enseña ya para que la persona sepa que es su rol. */
export function useKnowledgeSearch(q: string) {
  const termino = q.trim();
  return useQuery({
    queryKey: queryKeys.supportKnowledgeSearch(termino),
    queryFn: () => searchKnowledge(termino),
    enabled: termino.length >= 2,
    retry: false,
  });
}

export function useKnowledgeFaq() {
  return useQuery({
    queryKey: queryKeys.supportKnowledgeFaq,
    queryFn: listKnowledgeFaq,
    retry: false,
  });
}

function useKnowledgeInvalidation() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["support", "knowledge"] });
}

export function useCreateArticleMutation() {
  return useMutation({
    mutationFn: (input: { body: CreateArticleInput; key: string }) =>
      createKnowledgeArticle(input.body, input.key),
  });
}

export function useCreateVersionMutation() {
  return useMutation({
    mutationFn: (input: {
      articleId: string;
      body: CreateVersionInput;
      key: string;
    }) => createKnowledgeVersion(input.articleId, input.body, input.key),
  });
}

/** Publicar cambia lo que devuelve la búsqueda: por eso invalida la sección de conocimiento. */
export function useVersionTransitionMutation() {
  const invalidate = useKnowledgeInvalidation();
  return useMutation({
    mutationFn: (input: {
      versionId: string;
      action: VersionAction;
      note?: string;
    }) => transitionKnowledgeVersion(input.versionId, input.action, input.note),
    onSuccess: invalidate,
  });
}

/**
 * Las versiones que esta persona redactó o movió desde este navegador.
 *
 * Existe porque el servidor no ofrece una lista de borradores y revisiones pendientes: sólo busca en
 * lo publicado. Sin esto, quien redacta perdería el número de versión al recargar, y es justo el
 * número que tiene que pasarle a quien aprueba.
 */
export function useTrackedVersions() {
  const { user } = useAuth();
  const userId = user?.id ?? "anonimo";
  const [versiones, setVersiones] = useState<TrackedVersion[]>([]);

  useEffect(() => {
    setVersiones(readTrackedVersions(userId));
  }, [userId]);

  const registrar = useCallback(
    (version: TrackedVersion) => {
      setVersiones((actuales) => {
        const siguiente = [
          version,
          ...actuales.filter((v) => v.versionId !== version.versionId),
        ].slice(0, TOPE_VERSIONES);
        writeTrackedVersions(userId, siguiente);
        return siguiente;
      });
    },
    [userId],
  );

  const olvidar = useCallback(
    (versionId: string) => {
      setVersiones((actuales) => {
        const siguiente = actuales.filter((v) => v.versionId !== versionId);
        writeTrackedVersions(userId, siguiente);
        return siguiente;
      });
    },
    [userId],
  );

  return { versiones, registrar, olvidar };
}
