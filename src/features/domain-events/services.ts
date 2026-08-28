import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  DomainEventDefinition,
  DomainEventSummary,
  EventActionResult,
} from "./types";

/**
 * El endpoint responde `{ data, pagination }` y el cliente del portal desenvuelve `data`: lo que
 * llega aquí es el ARRAY, sin el bloque de paginación. Por eso la pantalla pagina por «hay tantos
 * como el límite» en vez de por un total, que sería inventarse un número que no ha recibido.
 */
export function listDomainEvents(query: QueryParams) {
  return apiRequest<DomainEventSummary[]>("/operations/events", { query });
}

export function listEventCatalog() {
  return apiRequest<DomainEventDefinition[]>("/operations/events/catalog");
}

export function getDomainEvent(eventId: string) {
  return apiRequest<DomainEventSummary>(`/operations/events/${eventId}`);
}

export function retryDomainEvent(eventId: string) {
  return apiRequest<EventActionResult>(`/operations/events/${eventId}/retry`, {
    method: "POST",
  });
}

export function cancelDomainEvent(eventId: string) {
  return apiRequest<EventActionResult>(`/operations/events/${eventId}/cancel`, {
    method: "POST",
  });
}

/**
 * Publicar exige `x-idempotency-key` y se manda a mano.
 *
 * El cliente del portal sabe mandar `Idempotency-Key`, pero este endpoint lee la cabecera con
 * prefijo `x-`: usar la del cliente daría un 400 pidiendo una cabecera que el navegador sí estaba
 * enviando, con otro nombre.
 */
export function publishDomainEvent(body: unknown, idempotencyKey: string) {
  return apiRequest<EventActionResult>("/operations/events", {
    method: "POST",
    body,
    headers: { "x-idempotency-key": idempotencyKey },
  });
}
