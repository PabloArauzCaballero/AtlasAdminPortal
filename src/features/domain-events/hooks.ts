"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import {
  cancelDomainEvent,
  getDomainEvent,
  listDomainEvents,
  listEventCatalog,
  publishDomainEvent,
  retryDomainEvent,
} from "./services";

const RAIZ = ["operations", "events"] as const;

export function useDomainEvents(query: QueryParams) {
  return useQuery({
    queryKey: [...RAIZ, "list", query],
    queryFn: () => listDomainEvents(query),
  });
}

export function useEventCatalog() {
  return useQuery({
    queryKey: [...RAIZ, "catalog"],
    queryFn: () => listEventCatalog(),
  });
}

export function useDomainEvent(eventId: string) {
  return useQuery({
    queryKey: [...RAIZ, eventId],
    queryFn: () => getDomainEvent(eventId),
    enabled: Boolean(eventId),
  });
}

/** Reintentar, cancelar y publicar invalidan la misma raíz: las tres cambian el outbox. */
function useEventMutation<TInput>(accion: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RAIZ });
    },
  });
}

export function useRetryEventMutation() {
  return useEventMutation((eventId: string) => retryDomainEvent(eventId));
}

export function useCancelEventMutation() {
  return useEventMutation((eventId: string) => cancelDomainEvent(eventId));
}

export function usePublishEventMutation() {
  return useEventMutation(
    (input: { body: unknown; idempotencyKey: string }) =>
      publishDomainEvent(input.body, input.idempotencyKey),
  );
}
