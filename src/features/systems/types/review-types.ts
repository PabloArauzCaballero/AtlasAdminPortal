import type { PaginatedResponse } from "@/shared/api/types";
import type {
  DataEntity,
  DataEntityImpact,
  EndpointItem,
  FieldImpact,
  RiskLevel,
  ToolRequirement,
} from "./catalog-types";

export type ActionLog = {
  actionLogId: string;
  requestId: string;
  correlationId: string | null;
  endpointCatalogId: string | null;
  actorUserId: string | null;
  actorType: string | null;
  actorRole: string | null;
  method: string;
  routeTemplate: string | null;
  resolvedUrlSanitized: string | null;
  module: string | null;
  actionName: string | null;
  ipAddress: string | null;
  targetType: string | null;
  targetId: string | null;
  customerId: string | null;
  responseStatusCode: number | null;
  durationMs: number | null;
  riskLevel: RiskLevel;
  containsPii: boolean;
  occurredAt: string | null;
};

export type ReviewQueueBucket<T> = { items: T[]; total: number };
export type ReviewQueue = {
  endpoints: ReviewQueueBucket<EndpointItem>;
  dataEntities: ReviewQueueBucket<DataEntity>;
  dataEntityImpacts: ReviewQueueBucket<DataEntityImpact>;
  fieldImpacts: ReviewQueueBucket<FieldImpact>;
  toolRequirements: ReviewQueueBucket<ToolRequirement>;
};

export type ReviewDecisionInput = {
  reviewStatus: "NEEDS_REVIEW" | "APPROVED" | "REJECTED";
  confidenceLevel?: "LOW" | "MEDIUM" | "HIGH";
  notes?: string;
};

export type ReviewTargetType =
  "endpoint" | "dataEntity" | "dataImpact" | "fieldImpact" | "toolRequirement";

export type CatalogSeedRefreshInput = {
  includeTools: boolean;
  includeDataEntities: boolean;
  includeEndpointSeeds: boolean;
};

export type EndpointDiscoveryInput = {
  mode: "SOURCE_SCAN";
  persist: boolean;
};

export type ActionLogListResponse = PaginatedResponse<ActionLog>;
