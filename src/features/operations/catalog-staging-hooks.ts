"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  decideStagingItems,
  listStagingItems,
} from "./catalog-staging-services";
import type {
  StagingDecisionBatchInput,
  StagingItemQuery,
} from "./catalog-staging-types";

const ROOT = ["operations", "catalog-staging-items"] as const;

export function useStagingItems(query: StagingItemQuery, enabled = true) {
  return useQuery({
    queryKey: [...ROOT, query],
    queryFn: () => listStagingItems(query),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useStagingDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      body: StagingDecisionBatchInput;
      idempotencyKey: string;
    }) => decideStagingItems(input.body, input.idempotencyKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["operations"] });
    },
  });
}
