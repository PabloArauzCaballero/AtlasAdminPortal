"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getWorkflowGraph,
  getWorkflowTree,
  getWorkflowVersions,
  listWorkflows,
  validateWorkflowTransition,
} from "./services";
import type { WorkflowTreeQuery } from "./types";

/**
 * El catálogo de flujos cambia con un despliegue, no con cada clic: se cachea
 * generoso para que moverse por el diagrama no dispare una petición por filtro.
 */
const CATALOG_STALE_MS = 5 * 60_000;

const keys = {
  list: (params: unknown) => ["workflows", "list", params] as const,
  versions: (code: string) => ["workflows", "versions", code] as const,
  tree: (code: string, query: unknown) =>
    ["workflows", "tree", code, query] as const,
  graph: (code: string, query: unknown) =>
    ["workflows", "graph", code, query] as const,
};

export function useWorkflows(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => listWorkflows(params),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useWorkflowVersions(workflowCode: string) {
  return useQuery({
    queryKey: keys.versions(workflowCode),
    queryFn: () => getWorkflowVersions(workflowCode),
    enabled: Boolean(workflowCode),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useWorkflowTree(
  workflowCode: string,
  query?: WorkflowTreeQuery,
) {
  return useQuery({
    queryKey: keys.tree(workflowCode, query ?? {}),
    queryFn: () => getWorkflowTree(workflowCode, query),
    enabled: Boolean(workflowCode),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useWorkflowGraph(
  workflowCode: string,
  query?: WorkflowTreeQuery,
) {
  return useQuery({
    queryKey: keys.graph(workflowCode, query ?? {}),
    queryFn: () => getWorkflowGraph(workflowCode, query),
    enabled: Boolean(workflowCode),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useValidateWorkflowTransitionMutation(workflowCode: string) {
  return useMutation({
    mutationFn: (body: Parameters<typeof validateWorkflowTransition>[1]) =>
      validateWorkflowTransition(workflowCode, body),
  });
}
