import { apiRequest } from "@/shared/api/client";
import type {
  GovernancePolicyConfigInput,
  GovernancePolicyDetail,
} from "./types";

export function getGovernancePolicy(policyId: string) {
  return apiRequest<GovernancePolicyDetail>(
    `/internal/governance/policies/${policyId}`,
  );
}

export function updateGovernancePolicy(
  policyId: string,
  body: GovernancePolicyConfigInput,
) {
  return apiRequest<unknown>(`/internal/governance/policies/${policyId}`, {
    method: "PATCH",
    body,
  });
}
