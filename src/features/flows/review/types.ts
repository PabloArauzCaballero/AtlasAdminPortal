import type { PaginationMeta } from "@/shared/api/types";
import type { Flow } from "../types";

/** Por qué un flujo está en la cola. Vacío en NEEDS_REVIEW: volvió porque su código cambió. */
export type FlowReviewReason =
  | "SIN_ANALISIS"
  | "ANALISIS_PARCIAL"
  | "HUECOS_SIN_RESOLVER"
  | "EVENTO_DINAMICO";

export type FlowReviewStatus =
  "AUTO_DETECTED" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED";

export type FlowReviewItem = Flow & {
  /** Huella del código actual: se devuelve al decidir, para no aprobar un código que no se vio. */
  depsHash: string | null;
  reviewStatus: FlowReviewStatus;
  reviewConfidence: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reasons: FlowReviewReason[];
  codeChangedSinceReview: boolean;
};

export type FlowReviewQueueResponse = {
  items: FlowReviewItem[];
  meta: PaginationMeta;
};

export type FlowReviewDecision = {
  reviewStatus: "NEEDS_REVIEW" | "APPROVED" | "REJECTED";
  /** Si el código cambió desde que se cargó la cola, el backend responde 409 y no decide. */
  depsHash: string | null;
  notes?: string;
};
