/**
 * Contrato de la revisión de ítems en staging (`/operations/catalog-staging-items`).
 *
 * Espejo de `stagingItemDto`, `listStagingItemsQuerySchema` y `stagingDecisionBatchSchema` del
 * servidor. Va aparte de `catalog-version-types.ts` porque es otro recurso: lo que una ingesta
 * PROPONE, no lo que una versión ya contiene.
 */

import type { PaginationMeta } from "@/shared/api/types";

export type StagingReviewStatus = "pending_review" | "approved" | "rejected";

export type StagingItem = {
  stagingItemId: string;
  catalogId: string | null;
  ingestionJobId: string | null;
  proposedItemCode: string | null;
  proposedItemName: string | null;
  proposedAttributes: Record<string, unknown>;
  aiSuggested: boolean;
  reviewStatus: StagingReviewStatus | string;
  reviewNotes: string | null;
};

export type StagingItemQuery = {
  catalogCode?: string;
  ingestionJobId?: string;
  reviewStatus?: StagingReviewStatus;
  /** Por partes: código y nombre propuestos y n.º del ítem. Lo busca el servidor. */
  q?: string;
  aiSuggested?: boolean;
  page: number;
  limit: number;
};

/** Del ALCANCE entero (el catálogo o la ingesta), no de la página ni del buscador. */
export type StagingItemSummary = {
  total: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  aiSuggested: number;
};

export type StagingItemPage = {
  items: StagingItem[];
  total: number;
  page: number;
  pageSize: number;
  meta: PaginationMeta;
  /** Ausente en un servidor anterior, que no lo publicaba. */
  summary?: StagingItemSummary;
};

export type StagingDecision = "approve" | "reject";

export type StagingDecisionBatchInput = {
  targetCatalogVersionId: string;
  decisions: Array<{
    stagingItemId: string;
    decision: StagingDecision;
    decisionReason: string;
  }>;
};

/** El servidor sólo devuelve totales: el resultado por ítem lo arma el portal con lo que mandó. */
export type StagingDecisionResult = {
  processed: number;
  approved: number;
  rejected: number;
  itemsCreated: number;
};
