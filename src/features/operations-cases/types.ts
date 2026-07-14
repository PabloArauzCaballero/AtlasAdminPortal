import type { PaginatedResponse } from "@/shared/api/types";

export type WorkItemType = "manual_review" | "fraud";

export type WorkQueueItem = {
  workItemType: WorkItemType;
  caseId: string;
  caseCode: string | null;
  customerId: string | null;
  priority: string | null;
  status: string | null;
  reasonCode: string | null;
  openedAt: string | null;
  createdAt: string;
};

export type WorkQueueListResponse = PaginatedResponse<WorkQueueItem>;

export type ManualReviewDecision =
  | "approved"
  | "rejected"
  | "request_more_information"
  | "escalated_to_fraud"
  | "no_action";

export type FraudDecision =
  | "confirmed_fraud"
  | "false_positive"
  | "needs_more_investigation"
  | "blocked"
  | "escalated";

export type NextCustomerStatus =
  | "approved_for_next_step"
  | "rejected"
  | "pending_more_information"
  | "pending_fraud_review"
  | "registered"
  | "blocked";

export type ManualReviewDecisionInput = {
  decision: ManualReviewDecision;
  reasonCode: string;
  notes?: string;
  nextCustomerStatus?: NextCustomerStatus;
};

export type FraudDecisionInput = {
  decision: FraudDecision;
  reasonCode?: string;
  applyWatchlist?: boolean;
  nextCustomerStatus?: NextCustomerStatus;
  notes?: string;
};

export type ManualReviewDecisionResult = {
  caseId: string;
  customerId: string | null;
  decision: ManualReviewDecision;
  caseStatus: string;
  nextCustomerStatus: NextCustomerStatus | null;
};

export type FraudDecisionResult = {
  caseId: string;
  customerId: string | null;
  decision: FraudDecision;
  caseStatus: string;
  watchlistApplied: boolean;
  nextCustomerStatus: NextCustomerStatus | null;
};

export type InvestigationSummary = {
  customer: {
    customerId: string;
    customerCode: string | null;
    status: string | null;
    phoneLast4: string | null;
    emailDomain: string | null;
    createdAt: string;
  };
  profile: {
    firstName: string | null;
    lastName: string | null;
    birthDate: string | null;
    preferredLanguage: string | null;
  } | null;
  contacts: Array<{
    contactType: string | null;
    status: string | null;
    isPrimary: boolean | null;
    valueLast4: string | null;
  }>;
  consents: Array<{
    purposeCode: string | null;
    granted: boolean | null;
    grantedAt: string | null;
    revokedAt: string | null;
  }>;
  latestRiskAssessment: {
    riskAssessmentRunId: string;
    assessmentType: string | null;
    recommendedAction: string | null;
    riskLevel: string | null;
    fraudScore: number | null;
    decidedAt: string | null;
  } | null;
  manualReviewCases: Array<{
    caseId: string;
    caseCode: string | null;
    caseType: string | null;
    priority: string | null;
    status: string | null;
    openedAt: string | null;
  }>;
  fraudCases: Array<{
    caseId: string;
    caseCode: string | null;
    severity: string | null;
    caseStatus: string | null;
    openedAt: string | null;
  }>;
};
