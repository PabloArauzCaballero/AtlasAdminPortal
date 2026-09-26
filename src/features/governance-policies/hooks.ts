"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getGovernancePolicy } from "./services";

export function useGovernancePolicy(policyId: string) {
  return useQuery({
    queryKey: queryKeys.governancePolicy(policyId),
    queryFn: () => getGovernancePolicy(policyId),
    enabled: Boolean(policyId),
  });
}
