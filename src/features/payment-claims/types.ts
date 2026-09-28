import type { PaginationMeta } from "@/shared/api/types";

/** Los tres estados reales de `credit.loan_payment_claims.status`. */
export type PaymentClaimStatus =
  "pending_verification" | "verified" | "rejected";

/** Un aviso de pago tal como lo sirve `GET /operations/payment-claims`. */
export type SupervisedPaymentClaim = {
  claimId: string;
  claimCode: string;
  status: PaymentClaimStatus | string;
  claimedAmount: string;
  currencyCode: string;
  payerReference: string | null;
  hasProof: boolean;
  submittedAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
  loanId: string;
  loanCode: string | null;
  installmentId: string;
  installmentNumber: number | null;
  installmentDueDate: string | null;
  customerId: string;
  customerCode: string | null;
  customerName: string | null;
  partnerId: string | null;
  partnerName: string | null;
  /** Pendiente: horas esperando. Decidido: horas que tardó en decidirse. */
  ageHours: number;
  /** Pendiente con más horas de las que marca `summary.staleAfterHours`. */
  stale: boolean;
};

export type PaymentClaimsSummary = {
  pending: number;
  stalePending: number;
  staleAfterHours: number;
};

export type PaymentClaimsFilters = {
  status: string;
  partnerId: string;
  customerId: string;
  olderThanHours: string;
  page: number;
};

/** La respuesta, con la paginación ya en el formato de `DataTable` (`limit`). */
export type PaymentClaimsPage = {
  items: SupervisedPaymentClaim[];
  meta: PaginationMeta;
  summary: PaymentClaimsSummary;
};

export type PaymentClaimsApiResponse = {
  items: SupervisedPaymentClaim[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  summary: PaymentClaimsSummary;
};
