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

/**
 * De dónde salen las opciones de un filtro.
 *
 * `SCHEMA` es un conjunto cerrado que el backend valida: ofrecer un valor fuera
 * de la lista sería ofrecer un filtro que responde 400. `DATA` son los valores
 * que de verdad aparecen en la bitácora de este tenant —módulos, tipos de
 * actor—, que nadie declara en ningún sitio y por eso sólo la tabla conoce.
 */
export type FilterOptionSource = "SCHEMA" | "DATA";

/** Qué control necesita un filtro. Lo decide el backend, no la pantalla. */
export type FilterControl =
  "select" | "combobox" | "boolean" | "date-range" | "text" | "number";

export type ActionLogFilterField = {
  name: string;
  label: string;
  source: FilterOptionSource;
  control: FilterControl;
  options: Array<{ value: string; label: string }>;
  help?: string;
};

/**
 * Los filtros que la auditoría admite, con sus valores.
 *
 * Se pide al backend en vez de escribirse aquí porque la versión anterior tenía
 * los métodos y los niveles de riesgo copiados a mano en el componente: la
 * pantalla ofrecía tres de los once filtros que el endpoint acepta, y las
 * opciones copiadas podían separarse del esquema sin que nada fallara hasta que
 * alguien filtrara.
 */
export type ActionLogFilterCatalog = { fields: ActionLogFilterField[] };

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
