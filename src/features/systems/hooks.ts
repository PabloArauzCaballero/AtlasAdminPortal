"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  discoverEndpoints,
  getActionLogsByRequest,
  getDomain,
  getTool,
  inferDataImpacts,
  inferToolRequirements,
  getDashboard,
  getDataEntity,
  getEndpoint,
  getImpactByEndpoint,
  getImpactByTable,
  getToolsHealth,
  getTrafficLatencyReport,
  getTrafficLatencyTimeseries,
  listActionLogs,
  listDomains,
  listMongoLogs,
  listReviewQueue,
  listTools,
  listDataEntities,
  listEndpoints,
  refreshCatalogSeed,
  reviewCatalogTarget,
  updateDataEntityMetadata,
} from "./services";
import type {
  CatalogSeedRefreshInput,
  EndpointDiscoveryInput,
  ReviewDecisionInput,
  ReviewTargetType,
  DataEntityMetadataInput,
} from "./types";

export { useEndpointsByIds } from "./endpoint-reference-hooks";
export {
  useStressProfiles,
  useStressProfile,
  useStressMatrix,
  useQueueStressRunMutation,
  useStressRuns,
} from "./stress-hooks";
export {
  useTestSuites,
  useTestSuite,
  useRunTestSuiteMutation,
  useTestRuns,
  useTestRun,
} from "./qa-hooks";

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboard });
}

export function useToolsHealth() {
  return useQuery({
    queryKey: queryKeys.toolsHealth,
    queryFn: getToolsHealth,
    // Mantiene la vista sincronizada con el monitor del backend que dispara las
    // notificaciones de "servicio caído/recuperado": sin esto la página puede
    // mostrar un estado viejo mientras la campana ya avisó el incidente.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useEndpoints(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.endpoints(query),
    queryFn: () => listEndpoints(query),
  });
}

export function useEndpoint(endpointId: string) {
  return useQuery({
    queryKey: queryKeys.endpoint(endpointId),
    queryFn: () => getEndpoint(endpointId),
    enabled: Boolean(endpointId),
  });
}

export function useEndpointImpact(endpointId: string) {
  return useQuery({
    queryKey: queryKeys.endpointImpact(endpointId),
    queryFn: () => getImpactByEndpoint(endpointId),
    enabled: Boolean(endpointId),
  });
}

export function useDataEntities(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.dataEntities(query),
    queryFn: () => listDataEntities(query),
  });
}

export function useDataEntity(entityId: string) {
  return useQuery({
    queryKey: queryKeys.dataEntity(entityId),
    queryFn: () => getDataEntity(entityId),
    enabled: Boolean(entityId),
  });
}

export function useUpdateDataEntityMetadataMutation(entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DataEntityMetadataInput) =>
      updateDataEntityMetadata(entityId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dataEntity(entityId),
      });
      await queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}

export function useTableImpact(
  schemaName?: string | null,
  tableName?: string | null,
) {
  return useQuery({
    queryKey: queryKeys.tableImpact(schemaName ?? "", tableName ?? ""),
    queryFn: () => getImpactByTable(schemaName ?? "", tableName ?? ""),
    enabled: Boolean(schemaName && tableName),
  });
}

export function useActionLogs(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.actionLogs(query),
    queryFn: () => listActionLogs(query),
  });
}

export function useActionLogsByRequest(requestId: string) {
  return useQuery({
    queryKey: queryKeys.actionLogsByRequest(requestId),
    queryFn: () => getActionLogsByRequest(requestId),
    enabled: Boolean(requestId),
  });
}

export function useMongoLogs(query: QueryParams, options?: { live?: boolean }) {
  return useQuery({
    queryKey: queryKeys.mongoLogs(query),
    queryFn: () => listMongoLogs(query),
    refetchInterval: options?.live ? 10_000 : false,
  });
}

export function useTrafficLatencyReport(
  windowHours: number,
  options?: { live?: boolean },
) {
  return useQuery({
    queryKey: ["systems", "traffic-latency", windowHours] as const,
    queryFn: () => getTrafficLatencyReport(windowHours),
    refetchInterval: options?.live ? 5_000 : false,
  });
}

export function useTrafficLatencyTimeseries(
  windowHours: number,
  options?: { live?: boolean },
) {
  return useQuery({
    queryKey: ["systems", "traffic-latency-timeseries", windowHours] as const,
    queryFn: () => getTrafficLatencyTimeseries(windowHours),
    refetchInterval: options?.live ? 5_000 : false,
  });
}

export function useTools(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.tools(query),
    queryFn: () => listTools(query),
  });
}

export function useTool(toolId: string) {
  return useQuery({
    queryKey: queryKeys.tool(toolId),
    queryFn: () => getTool(toolId),
    enabled: Boolean(toolId),
  });
}

export function useDomains(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.domains(query),
    queryFn: () => listDomains(query),
  });
}

export function useDomain(domainCode: string) {
  return useQuery({
    queryKey: queryKeys.domain(domainCode),
    queryFn: () => getDomain(domainCode),
    enabled: Boolean(domainCode),
  });
}

export function useInferToolRequirementsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { persist: boolean }) => inferToolRequirements(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}

export function useInferDataImpactsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { persist: boolean }) => inferDataImpacts(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}

export function useDiscoverEndpointsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EndpointDiscoveryInput) => discoverEndpoints(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}

export function useRefreshCatalogSeedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CatalogSeedRefreshInput) => refreshCatalogSeed(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}

export function useReviewQueue(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.reviewQueue(query),
    queryFn: () => listReviewQueue(query),
  });
}

export function useReviewTargetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      targetType: ReviewTargetType;
      targetId: string;
      body: ReviewDecisionInput;
    }) => reviewCatalogTarget(input.targetType, input.targetId, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}
