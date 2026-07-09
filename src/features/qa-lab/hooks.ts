"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { EndpointItem } from "@/features/systems/types";
import type { QueryParams } from "@/shared/api/types";
import { executeEndpointDirectly } from "./direct-runner";
import { runStressBurst } from "./stress-runner";
import { listLabEndpoints } from "./services";
import type { EndpointRunInput, EndpointStressRunInput } from "./types";

export function useLabEndpoints(query: QueryParams) {
  return useQuery({
    queryKey: ["qa-lab", "endpoints", query],
    queryFn: () => listLabEndpoints(query),
  });
}

export function useEndpointRunMutation(endpoint?: EndpointItem) {
  return useMutation({
    mutationFn: (body: EndpointRunInput) => {
      if (!endpoint) {
        throw new Error("Selecciona un endpoint antes de ejecutar.");
      }
      return executeEndpointDirectly(endpoint, body);
    },
  });
}

export function useEndpointStressMutation(endpoint?: EndpointItem) {
  return useMutation({
    mutationFn: (body: EndpointStressRunInput) => {
      if (!endpoint) {
        throw new Error("Selecciona un endpoint antes de ejecutar.");
      }
      return runStressBurst(endpoint, body);
    },
  });
}
