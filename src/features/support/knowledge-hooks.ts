"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import {
  createKnowledgeArticle,
  createKnowledgeVersion,
  getKnowledgeVersion,
  listKnowledgeArticles,
  listKnowledgeVersions,
  transitionKnowledgeVersion,
  type VersionAction,
} from "./knowledge-services";
import type {
  CreateArticleInput,
  CreateVersionInput,
  KnowledgeArticlesQuery,
  KnowledgeVersionsQuery,
} from "./knowledge-types";

/** Un 403 no mejora reintentando: se enseña ya para que la persona sepa que es su rol. */
export function useKnowledgeArticles(query: KnowledgeArticlesQuery) {
  return useQuery({
    queryKey: queryKeys.supportKnowledgeArticles(query),
    queryFn: () => listKnowledgeArticles(query),
    retry: false,
  });
}

export function useKnowledgeVersions(query: KnowledgeVersionsQuery) {
  return useQuery({
    queryKey: queryKeys.supportKnowledgeVersions(query),
    queryFn: () => listKnowledgeVersions(query),
    retry: false,
  });
}

export function useKnowledgeVersion(versionId: string) {
  return useQuery({
    queryKey: queryKeys.supportKnowledgeVersion(versionId),
    queryFn: () => getKnowledgeVersion(versionId),
    enabled: Boolean(versionId),
    retry: false,
  });
}

function useKnowledgeInvalidation() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["support", "knowledge"] });
}

export function useCreateArticleMutation() {
  const invalidate = useKnowledgeInvalidation();
  return useMutation({
    onSuccess: invalidate,
    mutationFn: (input: { body: CreateArticleInput; key: string }) =>
      createKnowledgeArticle(input.body, input.key),
  });
}

export function useCreateVersionMutation() {
  const invalidate = useKnowledgeInvalidation();
  return useMutation({
    onSuccess: invalidate,
    mutationFn: (input: {
      articleId: string;
      body: CreateVersionInput;
      key: string;
    }) => createKnowledgeVersion(input.articleId, input.body, input.key),
  });
}

/** Cada paso mueve la versión de cola y cambia el estado del artículo: se refresca toda la sección. */
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
