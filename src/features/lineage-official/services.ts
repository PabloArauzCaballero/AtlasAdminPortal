import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  LineageGraph,
  LineageImpactResponse,
  LineageNodeDetail,
} from "./types";

export function getLineageGraph(query: QueryParams) {
  return apiRequest<LineageGraph>("/internal/lineage", { query });
}

export function getLineageNode(nodeId: string) {
  return apiRequest<LineageNodeDetail>(`/internal/lineage/nodes/${nodeId}`);
}

export function getLineageImpact(query: QueryParams) {
  return apiRequest<LineageImpactResponse>("/internal/lineage/impact", {
    query,
  });
}
