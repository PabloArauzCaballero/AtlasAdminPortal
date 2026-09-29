/**
 * Formas del libro de préstamos y de su calificación, tal y como las devuelve AtlasBackend.
 *
 * Los importes llegan como TEXTO decimal (`"1500.00"`): la columna es `DECIMAL(18,2)` y el backend
 * no los convierte a número para no perder el céntimo. Aquí se quedan como texto y sólo se
 * formatean al pintarlos.
 */

export type LoanMerchant = {
  partnerProfileId: string;
  displayName: string;
  businessCategory: string | null;
} | null;

/** Cabecera del préstamo (`LoanQueryService.summary`). */
export type LoanSummary = {
  loanId: string;
  loanCode: string;
  customerId: string;
  /** Sólo en la cartera para el personal (`GET /operations/loans`); `null`/ausente fuera de ella. */
  customerCode?: string | null;
  creditApplicationId: string | null;
  currencyCode: string;
  principalAmount: string;
  annualInterestRate: string;
  termMonths: number;
  status: string;
  disbursedAt: string | null;
  firstDueDate: string | null;
  maturityDate: string | null;
  paidPrincipal: string;
  paidInterest: string;
  paidLateFee: string;
  outstandingPrincipal: string;
  daysPastDue: number;
  worstDaysPastDue: number;
  delinquencyBucket: string | null;
  writtenOffAt: string | null;
  writtenOffAmount: string | null;
  decision: {
    executionId: string | null;
    artifactVersionId: string | null;
  };
  merchant: LoanMerchant;
};

export type LoanInstallment = {
  installmentId: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: string;
  interestAmount: string;
  lateFeeAmount: string;
  paidPrincipal: string;
  paidInterest: string;
  paidLateFee: string;
  status: string;
  daysPastDue: number;
  settledAt: string | null;
};

export type LoanPayment = {
  paymentId: string;
  paymentCode: string;
  amount: string;
  currencyCode: string;
  paymentMethod: string;
  externalReference: string | null;
  receivedAt: string;
  status: string;
  reversedAt: string | null;
  reversalReasonCode: string | null;
};

export type LoanHistoryEvent = {
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  reasonCode: string | null;
  happenedAt: string;
  notes: string | null;
};

/** `GET /loans/:loanId`: cabecera, cronograma, cobros e historial en una sola lectura. */
export type LoanDetail = LoanSummary & {
  schedule: LoanInstallment[];
  payments: LoanPayment[];
  history: LoanHistoryEvent[];
};

export type CustomerLoans = { items: LoanSummary[] };

/** Filtros de `GET /operations/loans` (la cartera para el personal). */
export type LoanPortfolioFilters = {
  status?: string;
  delinquencyBucket?: string;
  customerId?: string;
  creditApplicationId?: string;
  loanCode?: string;
  page: number;
  pageSize: number;
};

export type LoanPortfolioPage = {
  items: LoanSummary[];
  total: number;
  page: number;
  pageSize: number;
};

/** Una solicitud de crédito del cliente (`GET /customers/:id/credit-applications`). */
export type CreditApplicationSummary = {
  applicationId: string;
  applicationCode: string;
  status: string;
  requestedAmount: string;
  requestedTermMonths: number;
  currencyCode: string;
  submittedAt: string;
  decidedAt: string | null;
  decisionReasonCode: string | null;
  businessAcceptance: string | null;
  businessAcceptanceAt: string | null;
};

export type CustomerApplications = {
  customerId: string;
  applications: CreditApplicationSummary[];
};

export type DisburseInput = {
  notes?: string;
};

export type DisburseResult = {
  loanId: string;
  loanCode: string;
  status: string;
  maturityDate: string | null;
};

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "card",
  "qr",
  "wallet",
  "direct_debit",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type RegisterPaymentInput = {
  amount: string;
  currencyCode: string;
  paymentMethod: PaymentMethod;
  externalReference?: string;
};

export type RegisterPaymentResult = {
  paymentId: string;
  paymentCode: string;
  duplicated: boolean;
  loanStatus?: string;
};

export type ReversePaymentInput = { reasonCode: string; notes?: string };

export type ReversePaymentResult = {
  paymentId: string;
  status: string;
  loanStatus: string;
};

export type WriteOffInput = { reasonCode: string; notes: string };

export type WriteOffResult = {
  loanId: string;
  status: string;
  writtenOffAmount: string | null;
};

/** Calificación vigente de una deuda (`toLoanRatingResponse`). */
export type LoanRating = {
  id: string;
  loanId: string;
  customerId: string;
  policyVersionId: string;
  grade: string;
  gradeLabel: string;
  severityRank: number;
  daysPastDue: number;
  delinquencyBucket: string | null;
  exposureAmount: string;
  provisionRate: string;
  provisionAmount: string;
  previousGrade: string | null;
  ratingReason: string | null;
  isCurrent: boolean;
  ratedAt: string;
};

/** Calificación vigente del cliente, por arrastre de sus deudas (`toCustomerRatingResponse`). */
export type CustomerRating = {
  id: string;
  customerId: string;
  policyVersionId: string;
  grade: string;
  gradeLabel: string;
  severityRank: number;
  worstDaysPastDue: number;
  ratedLoanCount: number;
  totalExposureAmount: string;
  totalProvisionAmount: string;
  drivingLoanId: string | null;
  previousGrade: string | null;
  ratingReason: string | null;
  isCurrent: boolean;
  ratedAt: string;
};

export type LoanRatingHistory = { loanId: string; items: LoanRating[] };
export type CustomerRatingHistory = {
  customerId: string;
  items: CustomerRating[];
};

export type RatingScaleGrade = {
  grade: string;
  label: string;
  severityRank: number;
  minDaysPastDue: number;
  maxDaysPastDue: number | null;
  /** Fracción (0.05 = 5 %). */
  provisionRate: number;
  tone: "success" | "info" | "warning" | "critical";
  /** Explicación ya redactada por el servidor. */
  help: string;
};

export type RatingScale = {
  policyCode: string;
  versionCode: string;
  grades: RatingScaleGrade[];
};
