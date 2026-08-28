import type { JsonRecord } from "@/shared/api/types";

/**
 * Eventos de dominio (outbox).
 *
 * `operations/events` existía con seis rutas —catálogo, listado, detalle, publicación, reintento y
 * cancelación— y no lo llamaba ninguna pantalla: un evento atascado sólo se veía consultando
 * `outbox_events` a mano, y reintentarlo exigía un `curl`. Es justo lo contrario de lo que el
 * módulo dice de sí mismo: «permite reintentos auditables sin perder eventos».
 */

export type DomainEventSummary = {
  id: string;
  tenantId: string | null;
  eventCode: string;
  eventFamily: string | null;
  eventVersion: number | null;
  aggregateType: string | null;
  aggregateId: string | null;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  availableAt: string | null;
  processedAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  lastError: string | null;
  idempotencyKey: string | null;
  correlationId: string | null;
  causationId: string | null;
  sourceModule: string | null;
  sourceAction: string | null;
  payload: JsonRecord | null;
  metadata: JsonRecord | null;
  createdAt: string | null;
};

export type DomainEventDefinition = {
  eventCode: string;
  family?: string | null;
  version?: number | null;
  description?: string | null;
  [key: string]: unknown;
};

export type EventActionResult = JsonRecord;
