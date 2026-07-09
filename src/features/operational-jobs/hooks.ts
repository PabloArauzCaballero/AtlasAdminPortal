"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { cancelJobRun, getJobRun, listJobRuns, retryJobRun } from "./services";

export function useJobRuns(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.jobRuns(query),
    queryFn: () => listJobRuns(query),
  });
}

export function useJobRun(jobRunId: string) {
  return useQuery({
    queryKey: queryKeys.jobRun(jobRunId),
    queryFn: () => getJobRun(jobRunId),
    enabled: Boolean(jobRunId),
  });
}

export function useRetryJobRunMutation(jobRunId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => retryJobRun(jobRunId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "jobs"] });
    },
  });
}

export function useCancelJobRunMutation(jobRunId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelJobRun(jobRunId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "jobs"] });
    },
  });
}
