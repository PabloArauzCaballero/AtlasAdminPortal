import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type LineageNode = {
  nodeId: string;
  nodeType: string;
  label: string;
  domain: string | null;
  status: string | null;
  criticality: string | null;
  referenceId: string | null;
  metadata: JsonRecord | null;
};

export type LineageEdge = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  label: string | null;
  metadata: JsonRecord | null;
};

/** Cuánto se muestra frente a cuánto existe. El backend lo declara para cada familia. */
export type LineageCount = { shown: number; total: number; catalog?: number };

export type LineageGraphSummary = {
  nodeCount?: number;
  edgeCount?: number;
  source?: string;
  tables?: LineageCount;
  endpoints?: LineageCount;
  impactEdges?: LineageCount;
  relationshipEdges?: LineageCount;
  truncated?: boolean;
};

export type LineageGraph = {
  nodes: LineageNode[];
  edges: LineageEdge[];
  generatedAt: string | null;
  summary?: (LineageGraphSummary & JsonRecord) | null;
};

export type LineageNodeDetail = LineageNode & {
  incomingEdges?: LineageEdge[];
  outgoingEdges?: LineageEdge[];
  relatedNodes?: LineageNode[];
  /** El servidor corta la ficha en 500 aristas y lo declara aquí. */
  edgesTruncated?: boolean;
};

export type LineageImpactItem = {
  impactId: string;
  sourceNodeId: string;
  targetNodeId: string;
  /** `impact` (endpoint → tabla) o `relationship` (tabla → tabla). Un Core anterior no lo manda. */
  family?: "impact" | "relationship";
  impactType: string;
  /** Sólo las aristas endpoint → tabla tienen severidad; una relación entre tablas llega `null`. */
  severity: string | null;
  description: string | null;
  path?: LineageNode[];
};

export type LineageImpactSummary = {
  bySeverity: Record<string, number>;
  byFamily: Record<string, number>;
};

export type LineageImpactResponse = PaginatedResponse<LineageImpactItem> & {
  summary?: LineageImpactSummary;
};
