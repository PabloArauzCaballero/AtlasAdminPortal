import type { EndpointItem } from "@/features/systems/types";
import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";
import type { AssertionSummary, QaAssertion } from "./assertions";

export type LabEndpointList = PaginatedResponse<EndpointItem>;

export type EndpointRunInput = {
  environment: string;
  baseRouteKey: string;
  customHostUrl?: string;
  routeOverride?: string;
  dryRun: boolean;
  timeoutMs: number;
  allowMutations: boolean;
  payload: JsonRecord;
  queryParams: JsonRecord;
  pathParams: JsonRecord;
  headers: Record<string, string>;
  expectedResponse: QaExpectedResponse;
};

export type EndpointStressRunInput = {
  environment: string;
  baseRouteKey: string;
  customHostUrl?: string;
  routeOverride?: string;
  dryRun: boolean;
  targetRps: number;
  durationSeconds: number;
  concurrency: number;
  rampUpSeconds: number;
  maxRequests: number;
  timeoutMs?: number;
  maxErrorRate?: number;
  minThroughputRps?: number;
  maxAvgMs?: number;
  maxP95Ms?: number;
  maxP99Ms?: number;
  approvalTicket?: string;
  allowMutations: boolean;
  payload: JsonRecord;
  queryParams: JsonRecord;
  pathParams: JsonRecord;
  headers: Record<string, string>;
  expectedResponse: QaExpectedResponse;
};

export type QaExpectedResponse = {
  statusCodes: number[];
  maxLatencyMs?: number;
  maxResponseSizeBytes?: number;
  bodyContains?: string;
  jsonSubset?: unknown;
  headers: Record<string, string>;
};

export type DirectRunInput = EndpointRunInput;

export type DirectRunResult = {
  url: string;
  method: string;
  dryRun: boolean;
  httpStatus?: number;
  ok?: boolean;
  latencyMs?: number;
  responseBody?: unknown;
  responseSizeBytes?: number;
  responseHeaders?: Record<string, string>;
  responseRequestId?: string;
  requestHeaders?: Record<string, string>;
  pinoLogFileName?: string;
  pinoLogLines?: string[];
  assertions?: AssertionSummary;
  error?: string;
  warnings?: string[];
};

export type DirectStressInput = EndpointStressRunInput;

export type StressLatencyPoint = {
  second: number;
  count: number;
  errorCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
};

export type StressThresholdResult = QaAssertion;

export type DirectStressResult = {
  url: string;
  method: string;
  dryRun: boolean;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  errorRate: number;
  throughputRps: number;
  requestedTargetRps: number;
  plannedRequests: number;
  durationMs: number;
  capped: boolean;
  statusCounts: Record<string, number>;
  requestHeaders: Record<string, string>;
  warnings: string[];
  thresholds: StressThresholdResult[];
  latencyTimeline: StressLatencyPoint[];
  pinoLogFileName?: string;
  pinoLogLines?: string[];
};
