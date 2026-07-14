"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getStressProfile,
  listStressMatrix,
  listStressProfiles,
  listStressRuns,
  queueStressRun,
} from "./services";
import type { QueueStressRunInput } from "./types";

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
