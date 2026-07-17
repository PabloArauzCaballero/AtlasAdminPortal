import type { ContextCatalog } from "./types";

/**
 * Estados de una versión de catálogo (`context_catalog_versions.status`).
 * `rejected` existe como estado final pero el filtro del listado del backend no
 * lo acepta como valor de query — ver `listCatalogsQuerySchema`.
 */
export type CatalogVersionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "published"
  | "retired"
  | "rejected";

export type ContextItemAlias = {
  aliasId: string;
  aliasValue: string;
  aliasType: string;
  normalizedAlias: string;
  confidenceScore: string | null;
};

export type ContextItemRiskMapping = {
  riskMappingId: string;
  riskDimension: string;
  riskBand: string;
  scorePointsSuggested: string | null;
  reasonCode: string;
  explanation: string | null;
  modelUsage: string | null;
  validFrom: string | null;
  validUntil: string | null;
};

export type ContextItem = {
  contextItemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  attributes: Record<string, unknown>;
  sourceId: string | null;
  confidenceScore: string | null;
  isActive: boolean;
  aliases: ContextItemAlias[];
  riskMappings: ContextItemRiskMapping[];
};

export type CatalogVersionDetail = {
  catalog: ContextCatalog;
  version: {
    catalogVersionId: string;
    versionCode: string;
    status: CatalogVersionStatus;
    validFrom: string | null;
    validUntil: string | null;
    approvedAt: string | null;
    notes: string | null;
  };
  items: ContextItem[];
};

export type CreateCatalogVersionInput = {
  versionCode: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  items: Array<{
    itemCode: string;
    itemName: string;
    itemType: string;
    sourceCode?: string;
    confidenceScore?: string;
    attributes: Record<string, unknown>;
    aliases: Array<{
      aliasValue: string;
      aliasType: string;
      confidenceScore?: string;
    }>;
    riskMappings: Array<{
      riskDimension: string;
      riskBand: string;
      scorePointsSuggested?: string;
      reasonCode: string;
      explanation?: string;
      modelUsage?: string;
      validFrom?: string;
      validUntil?: string;
    }>;
  }>;
};

export type CreateCatalogVersionResult = {
  catalogCode: string;
  catalogVersionId: string;
  status: CatalogVersionStatus;
  itemsCreated: number;
  aliasesCreated: number;
  riskMappingsCreated: number;
};

export type SubmitCatalogVersionInput = { notes: string };
export type CatalogVersionStatusResult = {
  catalogVersionId: string;
  status: CatalogVersionStatus;
};

export type CatalogDecisionInput = {
  decision: "approve" | "reject" | "publish" | "retire";
  decisionReason: string;
  validFrom?: string;
  validUntil?: string;
};
export type CatalogDecisionResult = {
  catalogVersionId: string;
  decision: CatalogDecisionInput["decision"];
  status: CatalogVersionStatus;
  publishedAt: string | null;
};

export type CatalogIngestionInput = {
  catalogCode: string;
  sourceType: string;
  sourceName: string;
  sourceCode?: string;
  items: Array<{
    rawValue: string;
    normalizedValue?: string;
    itemType: string;
    confidenceScore?: string;
    rawPayload: Record<string, unknown>;
    aiSuggested: boolean;
  }>;
};
export type CatalogIngestionResult = {
  ingestionJobId: string;
  status: string;
  stagingItemsCreated: number;
};

export type ActivateRulesetInput = {
  activationReason: string;
  effectiveFrom?: string;
};
