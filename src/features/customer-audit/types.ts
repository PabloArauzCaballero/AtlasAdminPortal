import type { PaginationMeta } from "@/shared/api/types";

/**
 * Las 8 tablas origen que unifica la vista `audit_event_feed`. Es el único campo
 * categórico acotado del feed: `eventType` viene crudo de cada fuente (para
 * `operational_audit_log` es el `action_code`, p. ej. `risk_assessment.created`),
 * así que la clasificación visual se hace por `sourceTable`, no por `eventType`.
 */
export type CustomerAuditSourceTable =
  | "operational_audit_log"
  | "data_change_log"
  | "auth_event"
  | "consent_event"
  | "customer_action_log"
  | "customer_status_event"
  | "fraud_case_event"
  | "manual_review_event";

/** Evento de `GET /operations/audit/customer/:customerId/feed`. Sin `summary`. */
export type CustomerAuditFeedEvent = {
  sourceTable: string;
  eventType: string;
  occurredAt: string;
  actorType: string;
  targetType: string;
  targetId: string;
};

export type CustomerAuditFeedPage = {
  events: CustomerAuditFeedEvent[];
  nextCursor: string | null;
};

export type CustomerAuditFeedQuery = {
  limit?: number;
  cursor?: string;
};
