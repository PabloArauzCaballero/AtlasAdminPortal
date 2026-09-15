import { apiRequest } from "@/shared/api/client";
import { apiDownload } from "@/shared/api/download";
import type { QueryParams } from "@/shared/api/types";
import type {
  EvidenceDocumentList,
  FraudDecisionInput,
  IdentityDecisionInput,
  IdentityDecisionResult,
  FraudDecisionResult,
  InvestigationSummary,
  ManualReviewDecisionInput,
  ManualReviewDecisionResult,
  WorkQueueListResponse,
} from "./types";

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function listWorkQueue(query: QueryParams) {
  return apiRequest<WorkQueueListResponse>("/operations/work-queue", {
    query,
  });
}

export function decideManualReviewCase(
  caseId: string,
  body: ManualReviewDecisionInput,
) {
  return apiRequest<ManualReviewDecisionResult>(
    `/operations/manual-review-cases/${caseId}/decision`,
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("manual-review-decide") },
    },
  );
}

export function decideFraudCase(caseId: string, body: FraudDecisionInput) {
  return apiRequest<FraudDecisionResult>(
    `/operations/fraud-cases/${caseId}/decision`,
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey("fraud-case-decide") },
    },
  );
}

export function getInvestigationSummary(customerId: string) {
  return apiRequest<InvestigationSummary>(
    `/operations/customers/${customerId}/investigation-summary`,
  );
}

/**
 * Los documentos de identidad del cliente (carnet, dorso, selfie) y su decisión.
 *
 * Hasta el 2026-09-14 el portal decidía los casos de revisión sin ver las imágenes: la ruta que
 * las sirve existía y sólo la usaba el portal del Motor, y la ruta que resuelve la identidad
 * (`identity-verification/decision`) no tenía ningún llamador en ninguna pantalla.
 */
export function listEvidenceDocuments(customerId: string) {
  return apiRequest<EvidenceDocumentList>(
    `/customer-onboarding/${customerId}/evidence-documents`,
  );
}

/** Los bytes por descarga autenticada: un `<img src>` no manda `Authorization` y saldría roto. */
export function downloadEvidenceDocument(
  customerId: string,
  documentId: string,
) {
  return apiDownload(
    `/customer-onboarding/${customerId}/evidence-documents/${documentId}/content`,
    `evidencia-${documentId}`,
  );
}

export function decideIdentityVerification(
  customerId: string,
  body: IdentityDecisionInput,
) {
  return apiRequest<IdentityDecisionResult>(
    `/operations/customers/${customerId}/identity-verification/decision`,
    { method: "POST", body },
  );
}
