"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  clearComplianceMatches,
  decideEligibility,
  getBehaviorSummary,
  listCasesByCursor,
  recalculateRisk,
  runComplianceScreening,
} from "./customer-actions-services";
import type {
  CaseQueue,
  ClearMatchesInput,
  EligibilityDecisionInput,
} from "./customer-actions-types";

/**
 * Tras cualquier acción sobre el cliente cambian su estado, sus bloqueadores y a veces sus casos:
 * se refresca la ficha y las colas para que nadie decida sobre una foto vieja.
 */
async function refrescarCliente(queryClient: QueryClient, customerId: string) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.investigationSummary(customerId),
    }),
    queryClient.invalidateQueries({ queryKey: ["operations", "work-queue"] }),
    queryClient.invalidateQueries({ queryKey: ["operations", "case-queue"] }),
  ]);
}

export function useComplianceScreeningMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runComplianceScreening(customerId),
    onSuccess: () => refrescarCliente(queryClient, customerId),
  });
}

export function useClearMatchesMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ClearMatchesInput) =>
      clearComplianceMatches(customerId, body),
    onSuccess: () => refrescarCliente(queryClient, customerId),
  });
}

export function useEligibilityDecisionMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EligibilityDecisionInput) =>
      decideEligibility(customerId, body),
    onSuccess: () => refrescarCliente(queryClient, customerId),
  });
}

export function useRecalculateRiskMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recalculateRisk(customerId),
    onSuccess: () => refrescarCliente(queryClient, customerId),
  });
}

export function useBehaviorSummary(customerId: string) {
  return useQuery({
    queryKey: queryKeys.behaviorSummary(customerId),
    queryFn: () => getBehaviorSummary(customerId),
    enabled: Boolean(customerId),
  });
}

/** Rehace el resumen desde la bitácora y lo deja en la caché de la lectura normal. */
export function useRecalculateBehaviorMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getBehaviorSummary(customerId, true),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.behaviorSummary(customerId), data);
    },
  });
}

/** Una cola por cursor: cada «Cargar más» pide la página siguiente con el `nextCursor` anterior. */
export function useCaseQueue(queue: CaseQueue, filters: QueryParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.caseQueue(queue, filters),
    queryFn: ({ pageParam }) =>
      listCasesByCursor(queue, {
        ...filters,
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
