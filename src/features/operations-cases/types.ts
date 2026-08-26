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
  /**
   * El último intento de verificación de identidad, de cualquier canal.
   *
   * Faltaba, y era la mitad del expediente: quien investigaba un caso de fraude
   * documental tenía que abrir otra herramienta para saber si el carnet siquiera
   * se había verificado. `fraudRisk` es el riesgo de fraude DOCUMENTAL que mide
   * el worker —plantilla del SEGIP, aritmética interna del documento, física de
   * la imagen—, no la evidencia de que la foto fuera un carnet.
   */
  latestIdentityVerification: {
    attemptId: string;
    channel: string | null;
    result: string | null;
    similarity: number | null;
    fraudRisk: number | null;
    requestedAt: string | null;
    completedAt: string | null;
  } | null;
  /**
   * La FORMA de la agenda del cliente. Nunca su contenido: ni un nombre, ni un
   * teléfono, ni un hash — sólo cuentas y proporciones que calculó el teléfono.
   *
   * `available: false` es «no hay captura o no dio el permiso», que NO es lo
   * mismo que una agenda vacía. La pantalla tiene que decir esa diferencia: una
   * es menos evidencia y la otra sería evidencia en contra.
   */
  addressBook: {
    available: boolean;
    totalContacts: number;
    uniqueRatio: number;
    bolivianRatio: number;
    referencesFoundInAddressBook: number;
    riskMatches: number;
  };
};
