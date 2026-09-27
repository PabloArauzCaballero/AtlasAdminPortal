/**
 * Contrato de crédito tal y como lo sirve `operations/credit` y `customers/:id/credit-*`.
 *
 * Los importes llegan como texto (`"1500.00"`): son DECIMAL en la base y el backend no los
 * convierte, así que aquí se tipan como `string | number` y se formatean al pintarlos.
 */

export type CreditProductStatus = "draft" | "active" | "suspended" | "retired";

export type CreditProduct = {
  id: string;
  productCode: string;
  productName: string;
  description: string | null;
  currencyCode: string;
  minAmount: string | number;
  maxAmount: string | number;
  minTermMonths: number;
  maxTermMonths: number;
  annualInterestRate: string | number | null;
  minMonthlyIncome: string | number | null;
  requiresManualReview: boolean;
  status: CreditProductStatus | string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
};

export type CreditProductList = { products: CreditProduct[] };

export type CreateCreditProductBody = {
  productCode: string;
  productName: string;
  description?: string;
  currencyCode: string;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  annualInterestRate?: number;
  minMonthlyIncome?: number;
  requiresManualReview: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
};

export type CreateCreditProductResult = {
  productId: string;
  productCode: string;
  status: string;
};

export type ChangeProductStatusBody = {
  status: CreditProductStatus;
  reasonCode: string;
};

export type ChangeProductStatusResult = {
  productId: string;
  previousStatus: string;
  status: string;
};

export type CreditApplicationStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired";

export type BusinessAcceptance = "pending" | "accepted" | "declined";

/** La fila completa de la solicitud, tal cual la devuelve el detalle de operaciones. */
export type CreditApplication = {
  id: string;
  applicationCode: string;
  customerId: string;
  creditProductId: string;
  partnerProfileId: string | null;
  requestedAmount: string | number;
  requestedTermMonths: number;
  currencyCode: string;
  purposeCode: string | null;
  status: CreditApplicationStatus | string;
  decisionExecutionId: string | null;
  decisionMode: string | null;
  decisionScore: string | number | null;
  decisionRiskBand: string | null;
  decisionPricedRate: string | number | null;
  decisionPricingTier: string | null;
  decisionReasonCode: string | null;
  manualReviewCaseCode: string | null;
  manualReviewCaseSource: string | null;
  businessAcceptance: BusinessAcceptance | null;
  businessAcceptanceAt: string | null;
  businessAcceptanceBy: string | null;
  businessAcceptanceReasonCode: string | null;
  businessAcceptanceNotes: string | null;
  decidedAt: string | null;
  decisionValidUntil: string | null;
  submittedAt: string;
};

export type CreditApplicationEvent = {
  id: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  actorType: string;
  actorInternalUserId: string | null;
  reasonCode: string | null;
  notes: string | null;
  happenedAt: string;
};

export type CreditApplicationDetail = {
  application: CreditApplication;
  events: CreditApplicationEvent[];
};

export type CreditDecision = "approve" | "reject" | "request_more_information";

export type CreditDecisionBody = {
  decision: CreditDecision;
  reasonCode: string;
  notes?: string;
};

export type CreditDecisionResult = {
  applicationId: string;
  decision: CreditDecision;
  previousStatus: string;
  status: string;
};

export type BusinessAcceptanceBody = {
  accepted: boolean;
  reasonCode?: string;
  notes?: string;
};

export type BusinessAcceptanceResult = {
  applicationId: string;
  status: string;
  businessAcceptance: string | null;
  businessAcceptanceAt: string;
};

/** Resumen de una solicitud en la lista del cliente. */
export type CustomerCreditApplication = {
  applicationId: string;
  applicationCode: string;
  status: string;
  requestedAmount: string | number;
  requestedTermMonths: number;
  currencyCode: string;
  submittedAt: string;
  decidedAt: string | null;
  decisionReasonCode: string | null;
  businessAcceptance: BusinessAcceptance | null;
  businessAcceptanceAt: string | null;
};

export type CustomerCreditApplications = {
  customerId: string;
  applications: CustomerCreditApplication[];
};

/** Lo que el portal enseña de la línea; el contrato trae más (motivos, escala) para la app. */
export type CreditLine = {
  customerId: string;
  currencyCode: string;
  approvedLimit: number;
  used: number;
  available: number;
  maxAffordableInstallment: number | null;
  scoring: number | null;
  scoringBand: { code: string; label: string; tone: string };
  riskBand: string | null;
  pricingTier: string | null;
  annualPercentageRate: number | null;
  capacity: {
    recommendedLimit: number | null;
    bindingConstraint: string | null;
    evidence: string | null;
    explanation: string | null;
  };
  decision: {
    outcome: string | null;
    executionId: string | null;
    trigger: string | null;
    calculatedAt: string | null;
  };
  reasons: Array<{
    code: string;
    message: string;
    adverseAction: boolean;
  }>;
};
