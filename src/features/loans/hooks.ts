"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAtlasApiError } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query-keys";
import {
  disburseApplication,
  getCustomerRating,
  getCustomerRatingHistory,
  getLoan,
  getLoanRating,
  getLoanRatingHistory,
  getRatingScale,
  listCustomerApplications,
  listCustomerLoans,
  listPortfolioLoans,
  registerPayment,
  reversePayment,
  writeOffLoan,
} from "./services";
import type {
  DisburseInput,
  LoanPortfolioFilters,
  RegisterPaymentInput,
  ReversePaymentInput,
  WriteOffInput,
} from "./types";

/**
 * «Todavía no se calificó» NO es un error: el servidor responde 404 porque devolver una categoría
 * por defecto haría pasar por sano un crédito que el barrido nunca alcanzó. La pantalla lo pinta
 * como vacío; cualquier otro fallo sigue siendo error.
 */
async function nullIfNotFound<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (isAtlasApiError(error) && error.status === 404) return null;
    throw error;
  }
}

export function useLoan(loanId: string) {
  return useQuery({
    queryKey: queryKeys.carteraPrestamo(loanId),
    queryFn: () => getLoan(loanId),
    enabled: Boolean(loanId),
  });
}

export function usePortfolioLoans(filters: LoanPortfolioFilters) {
  return useQuery({
    queryKey: queryKeys.carteraLista(filters),
    queryFn: () => listPortfolioLoans(filters),
    placeholderData: (previous) => previous,
  });
}

/**
 * El préstamo que nació de una solicitud. Sólo se pide para las aprobadas: el resto no pudo
 * originar ninguno, y preguntar por cada fila multiplicaría las llamadas sin respuesta posible.
 */
export function useLoanOfApplication(applicationId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.carteraLista({ creditApplicationId: applicationId }),
    queryFn: () =>
      listPortfolioLoans({
        creditApplicationId: applicationId,
        page: 1,
        pageSize: 1,
      }),
    enabled,
    select: (data) => data.items[0] ?? null,
  });
}

export function useCustomerLoans(customerId: string) {
  return useQuery({
    queryKey: queryKeys.carteraCliente(customerId, "prestamos"),
    queryFn: () => listCustomerLoans(customerId),
  });
}

export function useCustomerApplications(customerId: string) {
  return useQuery({
    queryKey: queryKeys.carteraCliente(customerId, "solicitudes"),
    queryFn: () => listCustomerApplications(customerId),
  });
}

export function useCustomerRating(customerId: string) {
  return useQuery({
    queryKey: queryKeys.carteraCliente(customerId, "calificacion"),
    queryFn: () => nullIfNotFound(() => getCustomerRating(customerId)),
  });
}

export function useCustomerRatingHistory(customerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.carteraCliente(customerId, "calificacion-historial"),
    queryFn: () => getCustomerRatingHistory(customerId),
    enabled,
  });
}

export function useLoanRating(loanId: string) {
  return useQuery({
    queryKey: queryKeys.carteraCalificacionPrestamo(loanId, "vigente"),
    queryFn: () => nullIfNotFound(() => getLoanRating(loanId)),
  });
}

export function useLoanRatingHistory(loanId: string) {
  return useQuery({
    queryKey: queryKeys.carteraCalificacionPrestamo(loanId, "historial"),
    queryFn: () => getLoanRatingHistory(loanId),
  });
}

export function useRatingScale() {
  return useQuery({
    queryKey: queryKeys.carteraEscala,
    queryFn: () => getRatingScale(),
    staleTime: 5 * 60_000,
  });
}

/** Toda escritura sobre el libro invalida la raíz `cartera`: mueve saldo, mora y calificación. */
function useCarteraMutation<TInput, TResult>(
  accion: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cartera });
    },
  });
}

export function useDisburseMutation() {
  return useCarteraMutation(
    (input: {
      applicationId: string;
      body: DisburseInput;
      idempotencyKey: string;
    }) =>
      disburseApplication(
        input.applicationId,
        input.body,
        input.idempotencyKey,
      ),
  );
}

export function useRegisterPaymentMutation(loanId: string) {
  return useCarteraMutation(
    (input: { body: RegisterPaymentInput; idempotencyKey: string }) =>
      registerPayment(loanId, input.body, input.idempotencyKey),
  );
}

export function useReversePaymentMutation(loanId: string) {
  return useCarteraMutation(
    (input: { paymentId: string; body: ReversePaymentInput }) =>
      reversePayment(loanId, input.paymentId, input.body),
  );
}

export function useWriteOffMutation(loanId: string) {
  return useCarteraMutation((body: WriteOffInput) =>
    writeOffLoan(loanId, body),
  );
}
