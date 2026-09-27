"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import {
  getInstanceProgress,
  getProcess,
  getProcessWiring,
  listProcessInstances,
  listProcesses,
  type ProcessInstancesQuery,
} from "./services";

export function useProcesses() {
  return useQuery({
    queryKey: queryKeys.processes,
    queryFn: listProcesses,
  });
}

export function useProcess(code: string) {
  return useQuery({
    queryKey: queryKeys.process(code),
    queryFn: () => getProcess(code),
    enabled: Boolean(code),
  });
}

export function useProcessWiring(code: string) {
  return useQuery({
    queryKey: queryKeys.processWiring(code),
    queryFn: () => getProcessWiring(code),
    enabled: Boolean(code),
  });
}

export function useProcessInstances(
  code: string,
  query: ProcessInstancesQuery,
) {
  return useQuery({
    queryKey: queryKeys.processInstances(code, query),
    queryFn: () => listProcessInstances(code, query),
    enabled: Boolean(code),
    // Al pasar de página o escribir en el buscador la lista anterior se queda hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export function useInstanceProgress(code: string, instanceId: string | null) {
  return useQuery({
    queryKey: queryKeys.processInstanceProgress(code, instanceId ?? ""),
    queryFn: () => getInstanceProgress(code, instanceId ?? ""),
    enabled: Boolean(code && instanceId),
  });
}
