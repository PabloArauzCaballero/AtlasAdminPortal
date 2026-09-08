"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import {
  decidePartner,
  getPartnerStatus,
  listPartnerQueue,
  requestKybReview,
} from "./services";

const RAIZ = ["operations", "partners"] as const;
const COLA = [...RAIZ, "queue"] as const;

export function usePartnerQueue(query: QueryParams) {
  return useQuery({
    queryKey: [...COLA, query],
    queryFn: () => listPartnerQueue(query),
  });
}

export function usePartnerStatus(partnerId: string) {
  return useQuery({
    queryKey: [...RAIZ, partnerId],
    queryFn: () => getPartnerStatus(partnerId),
    enabled: Boolean(partnerId),
    retry: false,
  });
}

/**
 * Decidir saca el expediente de la cola: hay que invalidar las DOS consultas.
 *
 * Invalidando sólo el detalle, la fila decidida seguía en la lista y la pantalla invitaba a
 * decidirla otra vez — con un 409 esperando al final.
 */
/** Reintentar la verificación mueve el expediente: invalida la cola igual que decidir. */
export function useRequestKybReviewMutation(partnerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => requestKybReview(partnerId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RAIZ });
    },
  });
}

export function useDecidePartnerMutation(partnerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { approved: boolean; rejectionReason?: string }) =>
      decidePartner(partnerId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RAIZ });
    },
  });
}
