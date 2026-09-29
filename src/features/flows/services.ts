import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import { normalizePaginatedResponse } from "@/features/systems/normalizers";
import type {
  FindingsListResponse,
  Flow,
  FlowDetail,
  FlowGraph,
  FlowFinding,
  FlowImport,
  FlowModule,
  FlowScreen,
  FlowsListResponse,
  FlowsSummary,
  ScreensListResponse,
  VerifyFlowsResult,
} from "./types";

/**
 * Los filtros vacíos no viajan: el backend valida cada query con Zod y un
 * `risk=` en blanco no es «sin filtro», es un valor inválido y responde 400.
 */
export function compactQuery(query: QueryParams): QueryParams {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    ),
  );
}

export async function listFlows(
  query: QueryParams,
): Promise<FlowsListResponse> {
  const response = await apiRequest<unknown>("/systems/flows", {
    query: compactQuery(query),
  });
  return normalizePaginatedResponse<Flow>(response, ["flows"]);
}

export function getFlow(flowId: string) {
  return apiRequest<FlowDetail>(`/systems/flows/${flowId}`);
}

export function getFlowGraph(flowId: string) {
  return apiRequest<FlowGraph>(`/systems/flows/${flowId}/graph`);
}

export function getModuleGraph(
  systemCode: string,
  moduleName: string,
  includeRoles: boolean,
) {
  return apiRequest<FlowGraph>("/systems/flows/graph", {
    query: { systemCode, module: moduleName, includeRoles },
  });
}

export function getFlowsSummary() {
  return apiRequest<FlowsSummary>("/systems/flows/summary");
}

export function listFlowModules() {
  return apiRequest<FlowModule[]>("/systems/flows/modules");
}

export async function listFlowFindings(
  query: QueryParams,
): Promise<FindingsListResponse> {
  const response = await apiRequest<unknown>("/systems/flows/findings", {
    query: compactQuery(query),
  });
  return normalizePaginatedResponse<FlowFinding>(response, ["findings"]);
}

export async function listFlowScreens(
  query: QueryParams,
): Promise<ScreensListResponse> {
  const response = await apiRequest<unknown>("/systems/flows/screens", {
    query: compactQuery(query),
  });
  return normalizePaginatedResponse<FlowScreen>(response, ["screens"]);
}

export function verifyFlows(body: { systemCode: string; windowDays: number }) {
  return apiRequest<VerifyFlowsResult>("/systems/flows/verify", {
    method: "POST",
    body,
  });
}

export function listFlowImports() {
  return apiRequest<FlowImport[]>("/systems/flows/imports");
}

/** Lee un conteo agrupado de Sequelize (`[{ risk: 'HIGH', count: 3 }]`) por el valor de una columna. */
export function groupCount(
  rows: Array<Record<string, unknown> & { count: number }> | undefined,
  column: string,
  value: string,
): number {
  return rows?.find((row) => row[column] === value)?.count ?? 0;
}
