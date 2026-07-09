"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  discoverEndpoints,
  getActionLogsByRequest,
  getStressProfile,
  getTool,
  inferToolRequirements,
  getDashboard,
  getDataEntity,
  getEndpoint,
  getImpactByEndpoint,
  getImpactByTable,
  getTestRun,
  getTestSuite,
  getToolsHealth,
  listActionLogs,
  listReviewQueue,
  listStressMatrix,
  listStressProfiles,
  listStressRuns,
  listTools,
  listDataEntities,
  listEndpoints,
  listTestRuns,
  listTestSuites,
  queueStressRun,
  refreshCatalogSeed,
  reviewCatalogTarget,
  runTestSuite,
  updateDataEntityMetadata,
} from "./services";
import type {
  CatalogSeedRefreshInput,
  EndpointDiscoveryInput,
  QueueStressRunInput,
  ReviewDecisionInput,
  ReviewTargetType,
  DataEntityMetadataInput,
} from "./types";

export { useEndpointsByIds } from "./endpoint-reference-hooks";

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboard });
}

export function useToolsHealth() {
  return useQuery({ queryKey: queryKeys.toolsHealth, queryFn: getToolsHealth });
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

export function useTestSuites(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.testSuites(query),
    queryFn: () => listTestSuites(query),
  });
}

export function useTestSuite(suiteId: string) {
  return useQuery({
    queryKey: queryKeys.testSuite(suiteId),
    queryFn: () => getTestSuite(suiteId),
    enabled: Boolean(suiteId),
  });
}

export function useRunTestSuiteMutation(suiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      environment: string;
      dryRun: boolean;
      timeoutMs: number;
      config: Record<string, unknown>;
      headers: Record<string, string>;
    }) => runTestSuite(suiteId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["systems", "test-runs"],
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.testSuite(suiteId),
      });
    },
  });
}

export function useTestRuns(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.testRuns(query),
    queryFn: () => listTestRuns(query),
  });
}

export function useTestRun(runId: string) {
  return useQuery({
    queryKey: queryKeys.testRun(runId),
    queryFn: () => getTestRun(runId),
    enabled: Boolean(runId),
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

export function useInferToolRequirementsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { persist: boolean }) => inferToolRequirements(body),
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

export function useStressProfiles(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.stressProfiles(query),
    queryFn: () => listStressProfiles(query),
  });
}

export function useStressProfile(profileId: string) {
  return useQuery({
    queryKey: queryKeys.stressProfile(profileId),
    queryFn: () => getStressProfile(profileId),
    enabled: Boolean(profileId),
  });
}

export function useStressMatrix(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.stressMatrix(query),
    queryFn: () => listStressMatrix(query),
  });
}

export function useQueueStressRunMutation(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: QueueStressRunInput) => queueStressRun(profileId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["systems", "stress-runs"],
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stressProfile(profileId),
      });
    },
  });
}

export function useStressRuns(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.stressRuns(query),
    queryFn: () => listStressRuns(query),
  });
}
