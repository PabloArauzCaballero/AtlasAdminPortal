"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import {
  createMerchantUser,
  listMerchantUsers,
  setMerchantUserStatus,
} from "./services";

const RAIZ = ["merchant", "users"] as const;

export function useMerchantUsers(query: QueryParams) {
  return useQuery({
    queryKey: [...RAIZ, query],
    queryFn: () => listMerchantUsers(query),
  });
}

function useIdentidadMutation<TInput>(accion: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RAIZ });
    },
  });
}

export function useCreateMerchantUserMutation() {
  return useIdentidadMutation(
    (input: {
      email: string;
      fullName: string;
      password: string;
      phone?: string;
      userCode?: string;
    }) => createMerchantUser(input),
  );
}

export function useSetMerchantUserStatusMutation() {
  return useIdentidadMutation(
    (input: { merchantUserId: string; status: string; reason?: string }) =>
      setMerchantUserStatus(input.merchantUserId, {
        status: input.status,
        ...(input.reason ? { reason: input.reason } : {}),
      }),
  );
}
