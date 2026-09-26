"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import {
  decidePartner,
  downloadPartnerQrImage,
  getPartnerStatus,
  listPartnerQueue,
  listQrPendingReview,
  requestKybReview,
  reviewPartnerQr,
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

const QR_PENDIENTES = [...RAIZ, "qr-codes", "pending"] as const;

export function useQrPendingReview() {
  return useQuery({
    queryKey: QR_PENDIENTES,
    queryFn: listQrPendingReview,
  });
}

/** Revisar saca el QR de la cola: se invalida la cola entera, no sólo la fila. */
export function useReviewPartnerQrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      partnerId: string;
      qrId: string;
      approved: boolean;
      note?: string;
    }) =>
      reviewPartnerQr(input.partnerId, input.qrId, {
        approved: input.approved,
        ...(input.note ? { note: input.note } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QR_PENDIENTES });
    },
  });
}

/**
 * La imagen del QR como URL local, viva mientras el componente lo esté.
 *
 * Se descarga con la sesión puesta y se pinta desde un blob: apuntar el `src` a la API daría un
 * 401 y una imagen rota, que es justo lo que no se puede tener delante de quien decide si esa
 * cuenta de cobro es la correcta.
 */
export function usePartnerQrImage(partnerId: string, qrId: string) {
  const query = useQuery({
    queryKey: [...RAIZ, partnerId, "qr-codes", qrId, "content"],
    queryFn: () => downloadPartnerQrImage(partnerId, qrId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const blob = query.data?.blob ?? null;
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return { url, isLoading: query.isLoading, error: query.error };
}
