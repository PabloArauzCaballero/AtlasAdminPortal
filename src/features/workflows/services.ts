import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  WorkflowGraph,
  WorkflowSummary,
  WorkflowTransition,
  WorkflowTransitionCheck,
  WorkflowTree,
  WorkflowTreeQuery,
} from "./types";

/**
 * Lectura del catálogo de flujos. Todo bajo `/workflows`, sin `x-tenant-id`:
 * el catálogo describe el software desplegado, no la operación de un cliente
 * (el avance por cliente vive en `/customers/:id/workflow-progress`).
 */

function toQuery(query: WorkflowTreeQuery | undefined): QueryParams {
  if (!query) return {};
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => Boolean(value)),
  ) as QueryParams;
}

export async function listWorkflows(query: QueryParams = {}) {
  const response = await apiRequest<
    WorkflowSummary[] | { data: WorkflowSummary[] }
  >("/workflows", { query });
  return Array.isArray(response) ? response : (response?.data ?? []);
}

export function getWorkflowVersions(workflowCode: string) {
  return apiRequest<WorkflowSummary[]>(`/workflows/${workflowCode}/versions`);
}

export function getWorkflowTree(
  workflowCode: string,
  query?: WorkflowTreeQuery,
) {
  return apiRequest<WorkflowTree>(`/workflows/${workflowCode}`, {
    query: toQuery(query),
  });
}

export function getWorkflowGraph(
  workflowCode: string,
  query?: WorkflowTreeQuery,
) {
  return apiRequest<WorkflowGraph>(`/workflows/${workflowCode}/graph`, {
    query: toQuery(query),
  });
}

export function getWorkflowTransitions(
  workflowCode: string,
  query?: WorkflowTreeQuery,
) {
  return apiRequest<WorkflowTransition[]>(
    `/workflows/${workflowCode}/transitions`,
    { query: toQuery(query) },
  );
}

/**
 * Pregunta al grafo declarado si un salto es legal. No autoriza la petición:
 * los guards y las reglas de cada servicio se siguen aplicando al ejecutar el
 * endpoint de verdad.
 */
export function validateWorkflowTransition(
  workflowCode: string,
  body: Readonly<{
    fromStepCode?: string;
    toStepCode: string;
    role?: string;
    currentState?: string;
    completedStepCodes?: string[];
    version?: string;
  }>,
) {
  return apiRequest<WorkflowTransitionCheck>(
    `/workflows/${workflowCode}/transitions/validate`,
    { method: "POST", body },
  );
}
