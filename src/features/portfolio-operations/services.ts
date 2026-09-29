import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  CustomerRatingResult,
  ExhaustedOutcomeList,
  LoanRatingResult,
  OutcomeDeliveryStatus,
  PortfolioSummary,
  RatingSweepResult,
} from "./types";

export function getPortfolioSummary() {
  return apiRequest<PortfolioSummary>(
    "/operations/credit-rating/portfolio-summary",
  );
}

export function sweepRatings(limit: number) {
  return apiRequest<RatingSweepResult>("/operations/credit-rating/sweep", {
    method: "POST",
    body: { limit },
  });
}

export function rateLoan(loanId: string) {
  return apiRequest<LoanRatingResult>(
    `/operations/credit-rating/loans/${encodeURIComponent(loanId)}/rate`,
    { method: "POST" },
  );
}

export function rateCustomer(customerId: string) {
  return apiRequest<CustomerRatingResult>(
    `/operations/credit-rating/customers/${encodeURIComponent(customerId)}/rate`,
    { method: "POST" },
  );
}

/**
 * Salud de la entrega de desenlaces al Motor. Sustituye a los botones «Recalcular mora» y
 * «Entregar desenlaces»: los dos son jobs, y lo que le toca a la pantalla es decir si van al día.
 */
export function getOutcomeDeliveryStatus() {
  return apiRequest<OutcomeDeliveryStatus>("/operations/loans/outcome-status");
}

/** Una página de los desenlaces agotados; `loanId` acota a un préstamo. */
export function listExhaustedOutcomes(query: QueryParams) {
  return apiRequest<ExhaustedOutcomeList>("/operations/loans/outcome-backlog", {
    query,
  });
}
