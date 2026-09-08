import { apiRequest } from "@/shared/api/client";
import type { PaginationMeta, QueryParams } from "@/shared/api/types";
import type {
  DomainEventDefinition,
  DomainEventList,
  DomainEventSummary,
  EventActionResult,
} from "./types";

/**
 * El listado llega como `{ data, pagination }` DENTRO del sobre global `{ requestId, data }`.
 *
 * El cliente del portal desenvuelve un solo nivel, así que lo que recibe este servicio no es el
 * array sino el objeto `{ data: [...], pagination: {...} }`. La pantalla lo daba por array y
 * reventaba en el primer `.filter`: la vista de eventos no se abría nunca. Aquí se convierte a la
 * forma que usa todo el portal, `{ items, meta }`, y de paso se recupera el TOTAL, que sí viene y
 * que antes se tiraba para paginar a ciegas por «vino una página llena».
 */
export async function listDomainEvents(
  query: QueryParams,
): Promise<DomainEventList> {
  const response = await apiRequest<unknown>("/operations/events", { query });
  return normalizeEventList(response, query);
}

export function normalizeEventList(
  response: unknown,
  query: QueryParams,
): DomainEventList {
  const page = Number(query.page ?? 1) || 1;
  const limit = Number(query.limit ?? 20) || 20;
  if (Array.isArray(response)) {
    return {
      items: response as DomainEventSummary[],
      meta: {
        page,
        limit,
        total: response.length,
        totalPages: 1,
      },
    };
  }
  const record = (response ?? {}) as Record<string, unknown>;
  const items = Array.isArray(record.data)
    ? (record.data as DomainEventSummary[])
    : Array.isArray(record.items)
      ? (record.items as DomainEventSummary[])
      : [];
  const pagination = (record.pagination ?? record.meta ?? {}) as Partial<
    PaginationMeta & { mode?: string }
  >;
  const total =
    typeof pagination.total === "number" ? pagination.total : items.length;
  const resolvedLimit =
    typeof pagination.limit === "number" ? pagination.limit : limit;
  return {
    items,
    meta: {
      page: typeof pagination.page === "number" ? pagination.page : page,
      limit: resolvedLimit,
      total,
      totalPages:
        typeof pagination.totalPages === "number"
          ? pagination.totalPages
          : Math.max(1, Math.ceil(total / Math.max(1, resolvedLimit))),
    },
  };
}

/**
 * El catálogo llama `code` a lo que el listado llama `eventCode` (y `family`/`version` a
 * `eventFamily`/`eventVersion`). Cruzar los dos por `eventCode` no encontraba nada y el
 * desplegable de «Publicar evento» salía vacío. Se traduce aquí, una vez, a los nombres del
 * listado, que son los que usa la pantalla.
 */
export async function listEventCatalog(): Promise<DomainEventDefinition[]> {
  const response = await apiRequest<unknown>("/operations/events/catalog");
  return normalizeEventCatalog(response);
}

export function normalizeEventCatalog(
  response: unknown,
): DomainEventDefinition[] {
  const raw = Array.isArray(response)
    ? response
    : Array.isArray((response as { data?: unknown })?.data)
      ? ((response as { data: unknown[] }).data ?? [])
      : [];
  return raw
    .map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      const eventCode =
        typeof record.eventCode === "string"
          ? record.eventCode
          : typeof record.code === "string"
            ? record.code
            : null;
      if (!eventCode) return null;
      return {
        eventCode,
        family:
          (record.eventFamily as string | undefined) ??
          (record.family as string | undefined) ??
          null,
        version:
          (record.eventVersion as number | undefined) ??
          (record.version as number | undefined) ??
          null,
        description: (record.description as string | undefined) ?? null,
        defaultPriority: (record.defaultPriority as number | undefined) ?? null,
        allowedAggregateTypes: Array.isArray(record.allowedAggregateTypes)
          ? (record.allowedAggregateTypes as string[])
          : [],
      } satisfies DomainEventDefinition;
    })
    .filter((entry): entry is DomainEventDefinition => entry !== null);
}

export function getDomainEvent(eventId: string) {
  return apiRequest<DomainEventSummary>(`/operations/events/${eventId}`);
}

/**
 * Reintentar y cancelar exigen `x-idempotency-key` igual que publicar.
 *
 * No la mandaban, y el backend respondía 400 «X-Idempotency-Key header is required» a los dos
 * botones: la pantalla ofrecía acciones que no podían ejecutarse. La llave se genera una por
 * pulsación, que es lo que permite repetir el clic tras un error de red sin duplicar el efecto.
 */
export function retryDomainEvent(eventId: string) {
  return apiRequest<EventActionResult>(`/operations/events/${eventId}/retry`, {
    method: "POST",
    headers: { "x-idempotency-key": globalThis.crypto.randomUUID() },
  });
}

export function cancelDomainEvent(eventId: string) {
  return apiRequest<EventActionResult>(`/operations/events/${eventId}/cancel`, {
    method: "POST",
    headers: { "x-idempotency-key": globalThis.crypto.randomUUID() },
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
