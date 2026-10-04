import { apiRequest } from "@/shared/api/client";
import type {
  CustomerCardTier,
  RevokeCardTierBody,
  SetCardTierBody,
} from "./card-tier-types";

const base = (customerId: string) =>
  `/operations/customers/${encodeURIComponent(customerId)}/card-tier`;

export function getCustomerCardTier(customerId: string) {
  return apiRequest<CustomerCardTier>(base(customerId));
}

export function setCustomerCardTier(customerId: string, body: SetCardTierBody) {
  return apiRequest<CustomerCardTier>(base(customerId), {
    method: "POST",
    body,
  });
}

export function revokeCustomerCardTier(
  customerId: string,
  body: RevokeCardTierBody,
) {
  return apiRequest<CustomerCardTier>(`${base(customerId)}/revoke`, {
    method: "POST",
    body,
  });
}
