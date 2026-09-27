/**
 * Contratos de las acciones internas sobre un cliente que el portal no llamaba hasta 2026-09-26:
 * cribado de listas restrictivas, descarte de coincidencias, decisión de habilitación, resumen de
 * comportamiento del alta, recálculo de riesgo y las colas de casos por cursor.
 *
 * Viven aparte de `types.ts` a propósito: ese fichero lo reescribe otra rama (estados canónicos de
 * la revisión manual) y dos cambios en el mismo sitio a la vez chocarían.
 */
import type { WorkQueueItem } from "./types";

/** Un bloqueador de la habilitación: el código es contrato estable del servidor. */
export type EligibilityBlocker = {
  code: string;
  fields?: string[];
  detail?: string;
};

/** `POST /operations/customers/:id/compliance/screening`. */
export type ComplianceScreeningResult = {
  customerId: string;
  candidatesEvaluated: number;
  newMatches: number;
  totalMatches: number;
  lifecycleStatus: string | null;
  eligible: boolean;
  blockers: EligibilityBlocker[];
};

/** Cuerpo de `POST /operations/customers/:id/compliance/clear-matches`: ambos obligatorios. */
export type ClearMatchesInput = { reasonCode: string; notes: string };

export type ClearMatchesResult = {
  customerId: string;
  clearedMatches: number;
  eligible: boolean;
  blockers: EligibilityBlocker[];
};

export type EligibilityDecision =
  "approve" | "reject" | "observe" | "suspend" | "reinstate";

/** Cuerpo de `POST /operations/customers/:id/eligibility/decision`. */
export type EligibilityDecisionInput = {
  decision: EligibilityDecision;
  reasonCode: string;
  notes?: string;
};

export type EligibilityDecisionResult = {
  customerId: string;
  decision: EligibilityDecision;
  previousStatus: string | null;
  lifecycleStatus: string;
  statusChanged: boolean;
  eligible: boolean;
  /** Con contenido, la aprobación se registró como excepción autorizada. */
  overriddenBlockers: string[];
  blockers: EligibilityBlocker[];
};

/** Detalle de `GET /operations/customers/:id/behavior-summary` (sólo lo que se pinta). */
export type BehaviorDetail = {
  segundosTotal: number | null;
  segundosEnSegundoPlano: number;
  correccionesTotales: number;
  pegadosEnIdentidad: number;
  capturasRepetidas: number;
  erroresDeValidacion: number;
  reanudaciones: number;
  toques: number;
  toquesSinVariacion: boolean;
  senales: string[];
};

export type BehaviorSummary = {
  completionTimeSeconds: number | null;
  interScreenTimingJson: {
    detalle?: Partial<BehaviorDetail>;
    version?: string;
  } | null;
  formErrorRate: number | null;
  ciCopyPasteDetected: boolean | null;
  abandonmentCountPrior: number;
  permissionGrantScore: number | null;
  botLikelihoodScore: number | null;
  computationVersion: string;
  disponible: boolean;
  onboardingFlowId: string | null;
  summaryId: string | null;
  computedAt: string;
  disparador: string;
};

/** Respuesta 201 de `POST /customers/:id/risk-assessments` (campos que se enseñan). */
export type RiskAssessmentCreated = {
  riskAssessmentRunId: string;
  riskAssessmentResultId: string;
  decision: string;
  riskLevel: string | null;
  manualReviewCaseId: string | null;
};

/** `GET /operations/manual-review-cases` y `GET /operations/fraud-cases`. */
export type CaseCursorPage = {
  items: WorkQueueItem[];
  nextCursor: string | null;
};

export type CaseQueue = "manual_review" | "fraud";
