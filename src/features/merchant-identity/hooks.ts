"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import {
  approveProvisioningRequest,
  listMerchantUsers,
  listProvisioningRequests,
  rejectProvisioningRequest,
  setMerchantUserStatus,
} from "./services";

const RAIZ = ["merchant", "users"] as const;
const COLA = ["merchant", "provisioning-requests"] as const;

export function useMerchantUsers(query: QueryParams) {
  return useQuery({
    queryKey: [...RAIZ, query],
    queryFn: () => listMerchantUsers(query),
    placeholderData: keepPreviousData,
  });
}

/**
 * Cuántas identidades hay en un estado, en TODO el tenant: una página de un elemento y su `total`.
 *
 * Los contadores de cabecera contaban las filas de la página que se estaba viendo, y se leían como
 * totales. Pedir el total al backend cuesta una consulta por contador y dice la verdad.
 */
export function useMerchantUserCount(status: string) {
  return useQuery({
    queryKey: [...RAIZ, "count", status],
    queryFn: () => listMerchantUsers({ page: 1, limit: 1, status }),
    select: (lista) => lista.total,
  });
}

/** Las peticiones pendientes de TODO el tenant, no sólo las de la primera página de la cola. */
export function usePendingProvisioningCount() {
  return useQuery({
    queryKey: [...COLA, "count", "pending"],
    queryFn: () =>
      listProvisioningRequests({ page: 1, limit: 1, status: "pending" }),
    select: (lista) => lista.total,
  });
}

export function useProvisioningRequests(query: QueryParams) {
  return useQuery({
    queryKey: [...COLA, query],
    queryFn: () => listProvisioningRequests(query),
    placeholderData: keepPreviousData,
  });
}

/**
 * Conceder toca las DOS listas: nace una identidad y se cierra una petición.
 *
 * Invalidar sólo la cola dejaba la tabla de identidades sin el alta recién concedida, y la pantalla
 * daba a entender que la aprobación no había hecho nada.
 */
function useDecisionMutation<TInput, TOutput>(
  accion: (input: TInput) => Promise<TOutput>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COLA }),
        queryClient.invalidateQueries({ queryKey: RAIZ }),
      ]);
    },
  });
}

export function useApproveRequestMutation() {
  return useDecisionMutation(
    (input: { requestId: string; userCode?: string }) =>
      approveProvisioningRequest(input.requestId, {
        ...(input.userCode ? { userCode: input.userCode } : {}),
      }),
  );
}

export function useRejectRequestMutation() {
  return useDecisionMutation((input: { requestId: string; reason: string }) =>
    rejectProvisioningRequest(input.requestId, { reason: input.reason }),
  );
}

export function useSetMerchantUserStatusMutation() {
  return useDecisionMutation(
    (input: { merchantUserId: string; status: string; reason?: string }) =>
      setMerchantUserStatus(input.merchantUserId, {
        status: input.status,
        ...(input.reason ? { reason: input.reason } : {}),
      }),
  );
}
