"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import {
  getPrivacyRequest,
  listPrivacyRequests,
  transitionPrivacyRequest,
} from "./services";
import type { PrivacyTransitionTarget } from "./types";

const RAIZ = ["privacy", "data-subject-requests"] as const;

export function usePrivacyRequests(query: QueryParams) {
  return useQuery({
    queryKey: [...RAIZ, "list", query],
    queryFn: () => listPrivacyRequests(query),
    // Cambiar de página o de filtro no vacía la tabla.
    placeholderData: keepPreviousData,
  });
}

export function usePrivacyRequest(requestId: string) {
  return useQuery({
    queryKey: [...RAIZ, "detail", requestId],
    queryFn: () => getPrivacyRequest(requestId),
    enabled: Boolean(requestId),
  });
}

/**
 * Una transición toca la lista y el detalle: el estado, el responsable, el resumen de vencidas y
 * el historial cambian a la vez. Invalidar sólo el detalle dejaba la cola diciendo «Recibida» de
 * una solicitud que ya estaba cerrada.
 */
export function usePrivacyTransitionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      toStatus: PrivacyTransitionTarget;
      reason?: string;
    }) =>
      transitionPrivacyRequest(input.requestId, {
        toStatus: input.toStatus,
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RAIZ }),
  });
}
