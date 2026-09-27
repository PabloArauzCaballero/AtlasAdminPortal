import { apiRequest } from "@/shared/api/client";
import { apiDownload } from "@/shared/api/download";
import type {
  CustomerApplications,
  CustomerLoans,
  CustomerRating,
  CustomerRatingHistory,
  DisburseInput,
  DisburseResult,
  LoanDetail,
  LoanPortfolioFilters,
  LoanPortfolioPage,
  LoanRating,
  LoanRatingHistory,
  RatingScale,
  RegisterPaymentInput,
  RegisterPaymentResult,
  ReversePaymentInput,
  ReversePaymentResult,
  WriteOffInput,
  WriteOffResult,
} from "./types";

const id = (value: string) => encodeURIComponent(value);

// ── Lectura ──────────────────────────────────────────────────────────────────

export function getLoan(loanId: string) {
  return apiRequest<LoanDetail>(`/loans/${id(loanId)}`);
}

/** La cartera entera, paginada y filtrada en el servidor. Los filtros vacíos no viajan. */
export function listPortfolioLoans(filters: LoanPortfolioFilters) {
  const query = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""),
  ) as Record<string, string | number>;
  return apiRequest<LoanPortfolioPage>("/operations/loans", { query });
}

export function listCustomerLoans(customerId: string) {
  return apiRequest<CustomerLoans>(`/customers/${id(customerId)}/loans`);
}

export function listCustomerApplications(customerId: string) {
  return apiRequest<CustomerApplications>(
    `/customers/${id(customerId)}/credit-applications`,
  );
}

export function getCustomerRating(customerId: string) {
  return apiRequest<CustomerRating>(
    `/operations/customers/${id(customerId)}/credit-rating`,
  );
}

export function getCustomerRatingHistory(customerId: string, limit = 20) {
  return apiRequest<CustomerRatingHistory>(
    `/operations/customers/${id(customerId)}/credit-rating-history`,
    { query: { limit } },
  );
}

export function getLoanRating(loanId: string) {
  return apiRequest<LoanRating>(`/operations/loans/${id(loanId)}/rating`);
}

export function getLoanRatingHistory(loanId: string, limit = 20) {
  return apiRequest<LoanRatingHistory>(
    `/operations/loans/${id(loanId)}/rating-history`,
    { query: { limit } },
  );
}

export function getRatingScale() {
  return apiRequest<RatingScale>("/operations/rating-scale");
}

/** El PDF lo compone el servidor con los mismos números que ve el cliente en la app. */
export function downloadSpendingReport(customerId: string) {
  return apiDownload(
    `/customers/${id(customerId)}/spending-report.pdf`,
    `atlas-gastos-${customerId}.pdf`,
  );
}

// ── Escritura: mueven dinero, llevan llave de idempotencia donde el servidor la pide ──

/**
 * La llave la genera quien pulsa (una por intento lógico): repetir con la misma devuelve el
 * préstamo ya creado; con otra, el servidor responde `LOAN_ALREADY_DISBURSED`.
 */
export function disburseApplication(
  applicationId: string,
  body: DisburseInput,
  idempotencyKey: string,
) {
  return apiRequest<DisburseResult>(
    `/credit-applications/${id(applicationId)}/disbursement`,
    { method: "POST", body, idempotencyKey },
  );
}

export function registerPayment(
  loanId: string,
  body: RegisterPaymentInput,
  idempotencyKey: string,
) {
  return apiRequest<RegisterPaymentResult>(`/loans/${id(loanId)}/payments`, {
    method: "POST",
    body,
    idempotencyKey,
  });
}

export function reversePayment(
  loanId: string,
  paymentId: string,
  body: ReversePaymentInput,
) {
  return apiRequest<ReversePaymentResult>(
    `/loans/${id(loanId)}/payments/${id(paymentId)}/reversal`,
    { method: "POST", body },
  );
}

export function writeOffLoan(loanId: string, body: WriteOffInput) {
  return apiRequest<WriteOffResult>(`/loans/${id(loanId)}/write-off`, {
    method: "POST",
    body,
  });
}
