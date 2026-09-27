"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import {
  changeCreditProductStatus,
  createCreditProduct,
  decideBusinessAcceptance,
  decideCreditApplication,
  getCreditApplication,
  getCustomerCreditLine,
  listCreditProducts,
  listCustomerCreditApplications,
  recalculateCreditLine,
} from "./services";
import type {
  BusinessAcceptanceBody,
  ChangeProductStatusBody,
  CreateCreditProductBody,
  CreditDecisionBody,
} from "./types";
import { isAtlasApiError } from "@/shared/api/errors";

export function useCreditProducts() {
  return useQuery({
    queryKey: queryKeys.creditProducts,
    queryFn: () => listCreditProducts(),
  });
}

export function useCreateCreditProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCreditProductBody) => createCreditProduct(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.creditProducts,
      });
    },
  });
}

export function useChangeCreditProductStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; body: ChangeProductStatusBody }) =>
      changeCreditProductStatus(input.productId, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.creditProducts,
      });
    },
  });
}

export function useCreditApplication(applicationId: string) {
  return useQuery({
    queryKey: queryKeys.creditApplication(applicationId),
    queryFn: () => getCreditApplication(applicationId),
    enabled: Boolean(applicationId),
  });
}

/** Tras decidir, cambian la solicitud, la lista del cliente y —si había caso CR— la cola. */
function useInvalidateApplication() {
  const queryClient = useQueryClient();
  return async (applicationId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.creditApplication(applicationId),
      }),
      queryClient.invalidateQueries({
        queryKey: ["credit", "customer-applications"],
      }),
      queryClient.invalidateQueries({ queryKey: ["operations", "work-queue"] }),
    ]);
  };
}

export function useDecideCreditApplicationMutation() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: (input: { applicationId: string; body: CreditDecisionBody }) =>
      decideCreditApplication(input.applicationId, input.body),
    onSuccess: async (_result, input) => invalidate(input.applicationId),
  });
}

export function useBusinessAcceptanceMutation() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: (input: {
      applicationId: string;
      body: BusinessAcceptanceBody;
    }) => decideBusinessAcceptance(input.applicationId, input.body),
    onSuccess: async (_result, input) => invalidate(input.applicationId),
  });
}

/**
 * La línea vigente del cliente. Un 404 no es un fallo: es `CREDIT_LINE_NOT_CALCULATED`, el motor
 * todavía no la calculó. Se devuelve `null` para que la pantalla lo diga como estado vacío y no
 * como error en rojo con botón de reintentar, que no arreglaría nada.
 */
export function useCustomerCreditLine(customerId: string) {
  return useQuery({
    queryKey: queryKeys.customerCreditLine(customerId),
    queryFn: async () => {
      try {
        return await getCustomerCreditLine(customerId);
      } catch (error) {
        if (isAtlasApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(customerId),
  });
}

export function useCustomerCreditApplications(customerId: string) {
  return useQuery({
    queryKey: queryKeys.customerCreditApplications(customerId),
    queryFn: () => listCustomerCreditApplications(customerId),
    enabled: Boolean(customerId),
  });
}

export function useRecalculateCreditLineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => recalculateCreditLine(customerId),
    onSuccess: (line, customerId) => {
      queryClient.setQueryData(queryKeys.customerCreditLine(customerId), line);
    },
  });
}
