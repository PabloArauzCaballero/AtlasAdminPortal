import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  ActionLog,
  ActionLogListResponse,
  CatalogSeedRefreshInput,
  EndpointDiscoveryInput,
  QueueStressRunInput,
  ReviewDecisionInput,
  ReviewQueue,
  ReviewTargetType,
  StressMatrixResponse,
  StressProfile,
  StressProfileListResponse,
  StressRunListResponse,
  ToolItem,
  ToolListResponse,
  DataEntityListResponse,
  DataEntityMetadataInput,
  Domain,
  DomainListResponse,
  EndpointListResponse,
  MongoLogListResponse,
  SystemsDashboard,
  ToolHealth,
  TrafficLatencyReport,
  TrafficLatencyTimeseries,
} from "./types";
import {
  normalizeDataEntity,
  normalizeEndpointDetail,
  normalizeEndpointImpact,
  normalizePaginatedResponse,
  normalizeTableImpact,
} from "./normalizers";

export function getDashboard() {
  return apiRequest<SystemsDashboard>("/systems/dashboard");
}

export async function getToolsHealth() {
  const response = await apiRequest<unknown>("/systems/health/tools");
  return normalizePaginatedResponse<ToolHealth>(response, ["tools", "health"])
    .items;
}

export async function listEndpoints(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/endpoints", { query });
  return normalizePaginatedResponse<EndpointListResponse["items"][number]>(
    response,
    ["endpoints", "routes", "records", "results"],
  );
}

export async function getEndpoint(endpointId: string) {
  const response = await apiRequest<unknown>(
    `/systems/endpoints/${endpointId}`,
  );
  return normalizeEndpointDetail(response);
}

export async function getImpactByEndpoint(endpointId: string) {
  const response = await apiRequest<unknown>(
    `/systems/impact/by-endpoint/${endpointId}`,
  );
  return normalizeEndpointImpact(response);
}

export async function listDataEntities(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/data-entities", {
    query,
  });
  return normalizePaginatedResponse<DataEntityListResponse["items"][number]>(
    response,
    ["dataEntities", "entities", "tables", "records", "results"],
  );
}

export async function getDataEntity(entityId: string) {
  const response = await apiRequest<unknown>(
    `/systems/data-entities/${entityId}`,
  );
  return normalizeDataEntity(response);
}

export function updateDataEntityMetadata(
  entityId: string,
  body: DataEntityMetadataInput,
) {
  return apiRequest<unknown>(`/systems/data-entities/${entityId}/metadata`, {
    method: "PATCH",
    body,
  });
}

export async function getImpactByTable(schemaName: string, tableName: string) {
  const response = await apiRequest<unknown>(
    `/systems/impact/by-table/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}`,
  );
  return normalizeTableImpact(response);
}

export async function listActionLogs(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/action-logs", { query });
  return normalizePaginatedResponse<ActionLogListResponse["items"][number]>(
    response,
    ["actionLogs", "logs", "records", "results"],
  );
}

export function getActionLogsByRequest(requestId: string) {
  return apiRequest<ActionLog[]>(
    `/systems/action-logs/by-request/${encodeURIComponent(requestId)}`,
  );
}

export function listMongoLogs(query: QueryParams) {
  return apiRequest<MongoLogListResponse>("/systems/logs/mongo", { query });
}

export function getTrafficLatencyReport(windowHours: number) {
  return apiRequest<TrafficLatencyReport>("/systems/reports/traffic-latency", {
    query: { windowHours },
  });
}

export function getTrafficLatencyTimeseries(windowHours: number) {
  return apiRequest<TrafficLatencyTimeseries>(
    "/systems/reports/traffic-latency-timeseries",
    { query: { windowHours } },
  );
}

export async function listTools(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/tools", { query });
  return normalizePaginatedResponse<ToolListResponse["items"][number]>(
    response,
    ["tools", "systemTools", "records", "results"],
  );
}

export function getTool(toolId: string) {
  return apiRequest<ToolItem>(`/systems/tools/${toolId}`);
}

export async function listDomains(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/domains", { query });
  return normalizePaginatedResponse<DomainListResponse["items"][number]>(
    response,
    ["domains", "records", "results"],
  );
}

export function getDomain(domainCode: string) {
  return apiRequest<Domain>(
    `/systems/domains/${encodeURIComponent(domainCode)}`,
  );
}

export function inferToolRequirements(body: { persist: boolean }) {
  return apiRequest<Record<string, unknown>>(
    "/systems/tools/infer-requirements",
    { method: "POST", body },
  );
}

export function inferDataImpacts(body: { persist: boolean }) {
  return apiRequest<Record<string, unknown>>(
    "/systems/data-entities/infer-impacts",
    { method: "POST", body },
  );
}

export function discoverEndpoints(body: EndpointDiscoveryInput) {
  return apiRequest<Record<string, unknown>>("/systems/endpoints/discover", {
    method: "POST",
    body,
  });
}

export function refreshCatalogSeed(body: CatalogSeedRefreshInput) {
  return apiRequest<Record<string, unknown>>(
    "/systems/endpoints/catalog-seed/refresh",
    { method: "POST", body },
  );
}

export function listReviewQueue(query: QueryParams) {
  return apiRequest<ReviewQueue>("/systems/review-queue", { query });
}

function reviewPath(targetType: ReviewTargetType, targetId: string): string {
  const paths: Record<ReviewTargetType, string> = {
    endpoint: `/systems/endpoints/${targetId}/review`,
    dataEntity: `/systems/data-entities/${targetId}/review`,
    dataImpact: `/systems/impact/data/${targetId}/review`,
    fieldImpact: `/systems/impact/fields/${targetId}/review`,
    toolRequirement: `/systems/tools/requirements/${targetId}/review`,
  };
  return paths[targetType];
}

export function reviewCatalogTarget(
  targetType: ReviewTargetType,
  targetId: string,
  body: ReviewDecisionInput,
) {
  return apiRequest<unknown>(reviewPath(targetType, targetId), {
    method: "PATCH",
    body,
  });
}

export async function listStressProfiles(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/stress-profiles", {
    query,
  });
  return normalizePaginatedResponse<StressProfileListResponse["items"][number]>(
    response,
    ["stressProfiles", "profiles", "records", "results"],
  );
}

export function getStressProfile(profileId: string) {
  return apiRequest<StressProfile>(`/systems/stress-profiles/${profileId}`);
}

export async function listStressMatrix(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/stress-matrix", {
    query,
  });
  return normalizePaginatedResponse<StressMatrixResponse["items"][number]>(
    response,
    ["stressMatrix", "matrix", "items", "records", "results"],
  );
}

export function queueStressRun(profileId: string, body: QueueStressRunInput) {
  return apiRequest<{ queued: boolean; run: Record<string, unknown> }>(
    `/systems/stress-profiles/${profileId}/queue-run`,
    { method: "POST", body },
  );
}

export async function listStressRuns(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/stress-runs", { query });
  return normalizePaginatedResponse<StressRunListResponse["items"][number]>(
    response,
    ["stressRuns", "runs", "records", "results"],
  );
}
