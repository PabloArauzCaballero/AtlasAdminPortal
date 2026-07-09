"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { getLineageGraph, getLineageImpact, getLineageNode } from "./services";

export function useLineageGraph(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.lineageGraph(query),
    queryFn: () => getLineageGraph(query),
  });
}

export function useLineageNode(nodeId: string) {
  return useQuery({
    queryKey: queryKeys.lineageNode(nodeId),
    queryFn: () => getLineageNode(nodeId),
    enabled: Boolean(nodeId),
  });
}

export function useLineageImpact(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.lineageImpact(query),
    queryFn: () => getLineageImpact(query),
  });
}
