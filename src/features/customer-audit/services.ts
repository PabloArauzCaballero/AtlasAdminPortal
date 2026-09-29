import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { CustomerAuditFeedPage, CustomerAuditFeedQuery } from "./types";

/**
 * La única ruta que usa el portal: paginado por cursor real sobre la vista `audit_event_feed`.
 * La anterior (`GET /operations/audit/customer/:id`) está deprecada en el backend y ya no se llama.
 * El header `x-tenant-id` lo agrega el cliente API; nunca se setea acá.
 */
export function getCustomerAuditFeed(
  customerId: string,
  query: CustomerAuditFeedQuery,
): Promise<CustomerAuditFeedPage> {
  return apiRequest<CustomerAuditFeedPage>(
    `/operations/audit/customer/${encodeURIComponent(customerId)}/feed`,
    { query: query as QueryParams },
  );
}
