"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getPendingWork, getRbacDrift } from "./services";
import type { PendingWorkQuery, RbacDriftQuery } from "./types";

export function usePendingWork(query: PendingWorkQuery) {
  return useQuery({
    queryKey: queryKeys.flowPendingWork(query),
    queryFn: () => getPendingWork(query),
    // Cambiar de página, de filtro o de ventana no vacía la tabla mientras llega la siguiente.
    placeholderData: keepPreviousData,
  });
}

export function useRbacDrift(query: RbacDriftQuery) {
  return useQuery({
    queryKey: queryKeys.flowRbacDrift(query),
    queryFn: () => getRbacDrift(query),
    placeholderData: keepPreviousData,
  });
}
