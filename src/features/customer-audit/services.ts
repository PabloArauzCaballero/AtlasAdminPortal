import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  CustomerAuditEventsPage,
  CustomerAuditEventsQuery,
  CustomerAuditFeedPage,
  CustomerAuditFeedQuery,
} from "./types";

/**
 * Ruta preferida: paginado por cursor real sobre la vista `audit_event_feed`.
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

/**
 * Ruta DEPRECADA en el backend (pagina en memoria). Se conserva porque es la
 * única que devuelve `summary` y acepta filtros por tipo y rango de fechas.
 */
export function listCustomerAuditEvents(
  customerId: string,
  query: CustomerAuditEventsQuery,
): Promise<CustomerAuditEventsPage> {
  return apiRequest<CustomerAuditEventsPage>(
    `/operations/audit/customer/${encodeURIComponent(customerId)}`,
    { query: query as QueryParams },
  );
}
