"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getCurrentRiskPolicy,
  getDataGovernancePolicies,
  listDataQualityIssues,
  listDefinitions,
  listOperationCatalogs,
  resolveDataQualityIssue,
} from "./services";
import type { ResolveDataQualityIssueInput } from "./types";
export function useOperationCatalogs(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.operationCatalogs(query),
    queryFn: () => listOperationCatalogs(query),
  });
}
export function useDefinitions(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.definitions(query),
    queryFn: () => listDefinitions(query),
  });
}
export function useDataGovernancePolicies() {
  return useQuery({
    queryKey: queryKeys.dataGovernancePolicies,
    queryFn: getDataGovernancePolicies,
  });
}
export function useCurrentRiskPolicy() {
  return useQuery({
    queryKey: queryKeys.currentRiskPolicy,
    queryFn: getCurrentRiskPolicy,
  });
}
export function useDataQualityIssues(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.dataQualityIssues(query),
    queryFn: () => listDataQualityIssues(query),
  });
}
export function useResolveDataQualityIssueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      issueId: string;
      body: ResolveDataQualityIssueInput;
    }) => resolveDataQualityIssue(input.issueId, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["operations", "data-quality"],
      });
    },
  });
}
