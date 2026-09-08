import type { JsonRecord, PaginationMeta } from "@/shared/api/types";

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

export type DomainEventList = {
  items: DomainEventSummary[];
  meta: PaginationMeta;
};

/**
 * Definición del catálogo, ya con los nombres del LISTADO (`eventCode`): el backend la publica
 * como `code`/`family`/`version` y `services.ts` la traduce. `allowedAggregateTypes` es lo que
 * decide sobre qué entidades puede publicarse el evento; con la lista, el formulario ofrece
 * opciones en vez de una caja libre.
 */
export type DomainEventDefinition = {
  eventCode: string;
  family: string | null;
  version: number | null;
  description: string | null;
  defaultPriority: number | null;
  allowedAggregateTypes: string[];
};

/**
 * Los estados del outbox tal y como los guarda el backend (`eventStatusSchema`): en minúsculas.
 * Filtrar por lo que pinta la insignia (`FAILED`) daba 400 hasta que el backend aceptó cualquier
 * caja; la lista fija evita además que el filtro sólo ofrezca los estados que ya están en pantalla.
 */
export const OUTBOX_EVENT_STATUSES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "cancelled",
] as const;

export type EventActionResult = JsonRecord;
