import { apiRequest } from "@/shared/api/client";
import type {
  DelinquencySweepResult,
  ExhaustedOutcomeList,
  OutcomeDispatchResult,
  PortfolioSummary,
  RatingSweepResult,
} from "./types";

export function getPortfolioSummary() {
  return apiRequest<PortfolioSummary>("/operations/credit-rating/portfolio-summary");
}

export function sweepRatings(limit: number) {
  return apiRequest<RatingSweepResult>("/operations/credit-rating/sweep", {
    method: "POST",
    body: { limit },
  });
}

export function rateLoan(loanId: string) {
  return apiRequest<Record<string, unknown>>(
    `/operations/credit-rating/loans/${loanId}/rate`,
    { method: "POST" },
  );
}

export function rateCustomer(customerId: string) {
  return apiRequest<Record<string, unknown>>(
    `/operations/credit-rating/customers/${customerId}/rate`,
    { method: "POST" },
  );
}

/**
 * `tenantScoped: true` por defecto y a propósito: en `false` barre la cartera de TODOS los
 * inquilinos, que es una operación de plataforma y no algo que deba pasar por descuido.
 */
export function sweepDelinquency(limit: number, tenantScoped: boolean) {
  return apiRequest<DelinquencySweepResult>("/operations/loans/delinquency-sweep", {
    method: "POST",
    body: { limit, tenantScoped },
  });
}

export function dispatchOutcomes(limit: number) {
  return apiRequest<OutcomeDispatchResult>("/operations/loans/outcome-dispatch", {
    method: "POST",
    body: { limit },
  });
}

export function listExhaustedOutcomes(limit: number) {
  return apiRequest<ExhaustedOutcomeList>("/operations/loans/outcome-backlog", {
    query: { limit },
  });
}
