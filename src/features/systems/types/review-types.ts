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
  | "endpoint"
  | "dataEntity"
  | "dataImpact"
  | "fieldImpact"
  | "toolRequirement"
  | "column";

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

export type MongoLogEntry = {
  id: string;
  type: "startup" | "append" | "rotation" | string;
  service: string | null;
  capturedAt: string | null;
  content: string | null;
  lineCount: number | null;
  bytes: number | null;
  fileSize: number | null;
  source: { filePath?: string; fileName?: string } | null;
};

export type MongoLogListResponse = PaginatedResponse<MongoLogEntry>;

export type TrafficLatencyRoute = {
  routeTemplate: string | null;
  method: string;
  totalRequests: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  errorRate: number;
  lastSeenAt: string;
};

export type TrafficLatencyReport = {
  windowHours: number;
  summary: {
    totalRequests: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
  };
  routes: TrafficLatencyRoute[];
};

export type TrafficLatencyBucket = {
  bucketStart: string;
  totalRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
};

export type TrafficLatencyTimeseries = {
  windowHours: number;
  bucketMinutes: number;
  buckets: TrafficLatencyBucket[];
};
