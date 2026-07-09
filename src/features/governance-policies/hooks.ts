"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getGovernancePolicy, updateGovernancePolicy } from "./services";
import type { GovernancePolicyConfigInput } from "./types";

export function useGovernancePolicy(policyId: string) {
  return useQuery({
    queryKey: queryKeys.governancePolicy(policyId),
    queryFn: () => getGovernancePolicy(policyId),
    enabled: Boolean(policyId),
  });
}

export function useUpdateGovernancePolicyMutation(policyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GovernancePolicyConfigInput) =>
      updateGovernancePolicy(policyId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.governancePolicy(policyId),
      });
      await queryClient.invalidateQueries({ queryKey: ["operations"] });
    },
  });
}
