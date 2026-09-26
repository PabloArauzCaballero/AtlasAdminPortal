"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getPendingWork, getRbacDrift } from "./services";

export function usePendingWork(windowDays: number) {
  return useQuery({
    queryKey: queryKeys.flowPendingWork(windowDays),
    queryFn: () => getPendingWork(windowDays),
  });
}

export function useRbacDrift() {
  return useQuery({
    queryKey: queryKeys.flowRbacDrift,
    queryFn: getRbacDrift,
  });
}
