import type { PaginationMeta } from "@/shared/api/types";

export const FLOW_RISKS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const FLOW_KINDS = [
  "READ",
  "CREATE",
  "UPDATE",
  "DELETE",
  "ACTION",
] as const;
export const FLOW_VERIFICATIONS = ["UNVERIFIED", "VERIFIED", "BROKEN"] as const;
export const FLOW_FRESHNESS = ["FRESH", "STALE"] as const;
export const FLOW_SYSTEMS = [
  "ATLAS_BACKEND",
  "DECISION_ENGINE",
  "ERP_BACKEND",
  "DASHBOARDS",
] as const;
export const FLOW_CLIENTS = [
  "ADMIN_PORTAL",
  "MOTOR_PORTAL",
  "ERP_PORTAL",
  "DASHBOARDS_PORTAL",
  "CONSUMER_APP",
] as const;

/** Un flujo derivado del código: una fila por operación HTTP de un bloque (nivel 2 del plan de Flujos). */
export type Flow = {
  id: string;
  slug: string;
  systemCode: string;
  name: string;
  module: string;
  kind: string;
  risk: string;
  riskBasis: string;
  badges: string[];
  discovery: string;
  verification: string;
  freshness: string;
  httpMethod: string;
  path: string;
  controller: string;
  handler: string;
  sourceFile: string | null;
  sourceLine: number | null;
  isPublic: boolean;
  roles: string[];
  internalPermissions: string[];
  guards: string[];
  callers: string[];
  testStatus: string;
  contractStatus: string;
  findingsCount: number;
  verifiedAt: string | null;
  verifiedBy: string | null;
  verificationEvidence: {
    source?: string;
    ok?: number;
    failed?: number;
    lastAt?: string | null;
    lastStatus?: number | null;
    statuses?: Record<string, number>;
    correlationSample?: string[];
  };
  reads: string[];
  writes: string[];
  analysis: {
    status: string;
    chainLength: number;
    services: string[];
    writes: Array<{ table: string; op: string; via: string }>;
    errors: string[];
    blockCalls: Array<{ target: string; at: string }>;
    unknowns: Array<{ reason: string; at: string }>;
    transactional: boolean;
  } | null;
  analyzedCommit: string | null;
  analyzedBranch: string | null;
  updatedAt: string;
};

export type FlowFinding = {
  id: string;
  key: string;
  kind: string;
  severity: string;
  systemCode: string;
  ref: string;
  module: string | null;
  summary: string;
  extra: Record<string, unknown>;
  knownSince: string | null;
  status: string;
  updatedAt: string;
};

export type FlowDetail = Flow & { findings: FlowFinding[] };

export type FlowScreen = {
  clientCode: string;
  route: string;
  sourceFile: string | null;
  navLabel: string | null;
  navPermissions: string[];
  navRoles: string[];
  analyzedCommit: string | null;
};

/** Conteos agrupados tal como los devuelve Sequelize (`count({ group })`): una fila por valor. */
export type GroupCount = Record<string, unknown> & { count: number };

export type FlowsSummary = {
  total: number;
  byRisk: GroupCount[];
  byVerification: GroupCount[];
  byFreshness: GroupCount[];
  bySystem: GroupCount[];
  openFindings: GroupCount[];
  publicWrites: number;
  untestedCritical: number;
};

export type FlowModule = { systemCode: string; module: string; count: number };

export type FlowImport = {
  id: string;
  scope: string;
  systemCode: string;
  analyzedCommit: string | null;
  analyzedBranch: string | null;
  contentHash: string | null;
  rowsReceived: number;
  rowsUpserted: number;
  rowsRemoved: number;
  createdBy: string | null;
  createdAt: string;
};

export type GraphNode = {
  id: string;
  type:
    | "ACTOR"
    | "CLIENT"
    | "ENDPOINT"
    | "GUARD"
    | "CONTROLLER"
    | "HANDLER"
    | "SERVICE"
    | "REPOSITORY"
    | "DATABASE"
    | "ERROR"
    | "BLOCK_CALL"
    | "UNKNOWN";
  layer: "CLIENT" | "API" | "BACKEND" | "DATA";
  label: string;
  sublabel?: string;
  meta?: Record<string, unknown>;
};
export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  confidence: number;
  evidence: string[];
  label?: string;
};
export type FlowGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { nodes: number; edges: number; flows: number; unknown: number };
};

export type FlowsListResponse = { items: Flow[]; meta: PaginationMeta };
export type FindingsListResponse = {
  items: FlowFinding[];
  meta: PaginationMeta;
};
export type ScreensListResponse = { items: FlowScreen[]; meta: PaginationMeta };

export type VerifyFlowsResult = {
  systemCode: string;
  windowDays: number;
  deployedCommit: string | null;
  routesWithRuns: number;
  verified: number;
  broken: number;
  unverified: number;
  stale: number;
  fresh: number;
  skippedNoLogs: number;
};

/** Un paso de un proceso de negocio del `workflow-catalog`, con el flujo que lo implementa. */
export type BusinessStep = {
  stepCode: string;
  name: string;
  stage: string | null;
  order: number;
  method: string;
  path: string;
  mandatory: boolean;
  requiresAuth: boolean;
  requiresIdempotencyKey: boolean;
  /** Nulo = el paso declara una ruta que el catálogo no tiene: cambió o ya no existe. */
  flowId: string | null;
  risk: string | null;
  verification: string | null;
  testStatus: string | null;
  module: string | null;
};

export type BusinessProcess = {
  workflowCode: string;
  name: string;
  version: string;
  steps: BusinessStep[];
  stepCount: number;
  linked: number;
  unlinked: number;
  verified: number;
  critical: number;
};

export type BusinessFlowsResponse = {
  processes: BusinessProcess[];
  totals: { processes: number; steps: number; unlinked: number };
};
