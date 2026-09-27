import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  BehaviorSummary,
  CaseCursorPage,
  CaseQueue,
  ClearMatchesInput,
  ClearMatchesResult,
  ComplianceScreeningResult,
  EligibilityDecisionInput,
  EligibilityDecisionResult,
  RiskAssessmentCreated,
} from "./customer-actions-types";
import { idempotencyKey } from "./services";

/**
 * Coteja al cliente contra las listas restrictivas. Idempotente en el servidor: repetirlo no
 * duplica coincidencias. Una coincidencia nueva lleva al cliente a `under_review`.
 */
export function runComplianceScreening(customerId: string) {
  return apiRequest<ComplianceScreeningResult>(
    `/operations/customers/${customerId}/compliance/screening`,
    { method: "POST" },
  );
}

/** Descarta TODAS las coincidencias del cliente; motivo y nota son obligatorios. */
export function clearComplianceMatches(
  customerId: string,
  body: ClearMatchesInput,
) {
  return apiRequest<ClearMatchesResult>(
    `/operations/customers/${customerId}/compliance/clear-matches`,
    { method: "POST", body },
  );
}

/** La decisión humana de habilitación: pasa por la máquina de estados del cliente. */
export function decideEligibility(
  customerId: string,
  body: EligibilityDecisionInput,
) {
  return apiRequest<EligibilityDecisionResult>(
    `/operations/customers/${customerId}/eligibility/decision`,
    { method: "POST", body },
  );
}

/**
 * Cómo hizo el alta el cliente. Sin `recalcular` devuelve la última foto (o `null` si nunca se
 * calculó); con él, rehace el resumen desde la bitácora de la app.
 */
export function getBehaviorSummary(customerId: string, recalcular = false) {
  return apiRequest<BehaviorSummary | null>(
    `/operations/customers/${customerId}/behavior-summary`,
    recalcular ? { query: { recalcular: "1" } } : {},
  );
}

/**
 * Una evaluación de riesgo nueva pedida por una persona desde el panel de operaciones.
 * `manual_recheck` + `operations_panel` es lo que distingue en la evidencia esta corrida de las
 * que dispara la app o el sistema.
 */
export function recalculateRisk(customerId: string) {
  return apiRequest<RiskAssessmentCreated>(
    `/customers/${customerId}/risk-assessments`,
    {
      method: "POST",
      body: { assessmentType: "manual_recheck", channel: "operations_panel" },
      headers: { "x-idempotency-key": idempotencyKey("risk-recheck") },
    },
  );
}

const CASE_QUEUE_PATH: Record<CaseQueue, string> = {
  manual_review: "/operations/manual-review-cases",
  fraud: "/operations/fraud-cases",
};

/** Una página por cursor de una de las dos colas (no combinadas). */
export function listCasesByCursor(queue: CaseQueue, query: QueryParams) {
  return apiRequest<CaseCursorPage>(CASE_QUEUE_PATH[queue], { query });
}
