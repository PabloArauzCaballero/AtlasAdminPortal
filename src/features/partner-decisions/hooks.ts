"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { decidePartner, getPartnerStatus, setPartnerMdrRate } from "./services";

const RAIZ = ["operations", "partners"] as const;

export function usePartnerStatus(partnerId: string) {
  return useQuery({
    queryKey: [...RAIZ, partnerId],
    queryFn: () => getPartnerStatus(partnerId),
    enabled: Boolean(partnerId),
    retry: false,
  });
}

function usePartnerMutation<TInput>(accion: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RAIZ });
    },
  });
}

export function useDecidePartnerMutation(partnerId: string) {
  return usePartnerMutation(
    (input: { approved: boolean; rejectionReason?: string }) =>
      decidePartner(partnerId, input),
  );
}

export function useSetMdrRateMutation(partnerId: string) {
  return usePartnerMutation((mdrRatePercent: number) =>
    setPartnerMdrRate(partnerId, mdrRatePercent),
  );
}
