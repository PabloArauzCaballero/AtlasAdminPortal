"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getFlow,
  getFlowGraph,
  getModuleGraph,
  getFlowsSummary,
  listFlowFindings,
  listFlowImports,
  listFlowModules,
  listFlowScreens,
  listFlows,
} from "./services";

export function useFlows(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.flows(query),
    queryFn: () => listFlows(query),
  });
}

export function useFlow(flowId: string | null) {
  return useQuery({
    queryKey: queryKeys.flow(flowId ?? ""),
    queryFn: () => getFlow(flowId ?? ""),
    enabled: Boolean(flowId),
  });
}

export function useFlowGraph(flowId: string | null) {
  return useQuery({
    queryKey: queryKeys.flowGraph(flowId ?? ""),
    queryFn: () => getFlowGraph(flowId ?? ""),
    enabled: Boolean(flowId),
  });
}

export function useModuleGraph(
  systemCode: string | null,
  moduleName: string | null,
  includeRoles: boolean,
) {
  return useQuery({
    queryKey: queryKeys.flowModuleGraph(
      systemCode ?? "",
      moduleName ?? "",
      includeRoles,
    ),
    queryFn: () =>
      getModuleGraph(systemCode ?? "", moduleName ?? "", includeRoles),
    enabled: Boolean(systemCode && moduleName),
  });
}

export function useFlowsSummary() {
  return useQuery({
    queryKey: queryKeys.flowsSummary,
    queryFn: getFlowsSummary,
  });
}

export function useFlowModules() {
  return useQuery({
    queryKey: queryKeys.flowModules,
    queryFn: listFlowModules,
  });
}

export function useFlowFindings(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.flowFindings(query),
    queryFn: () => listFlowFindings(query),
  });
}

export function useFlowScreens(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.flowScreens(query),
    queryFn: () => listFlowScreens(query),
  });
}

export function useFlowImports() {
  return useQuery({
    queryKey: queryKeys.flowImports,
    queryFn: listFlowImports,
  });
}
