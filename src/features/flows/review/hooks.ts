"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { listFlowReviewQueue, reviewFlow } from "./services";
import type { FlowReviewDecision } from "./types";

export function useFlowReviewQueue(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.flowReviewQueue(query),
    queryFn: () => listFlowReviewQueue(query),
  });
}

export function useReviewFlowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { flowId: string; body: FlowReviewDecision }) =>
      reviewFlow(input.flowId, input.body),
    // También al fallar: tras un 409 la fila sigue con la huella vieja, y sin recargar cada nuevo intento
    // volvía a dar 409 hasta que la caché caducaba.
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["systems", "flows-review-queue"],
      });
      await queryClient.invalidateQueries({ queryKey: ["systems", "flow"] });
      // Y el grafo de la ficha: si la decisión dio 409 porque el código cambió, la ficha abierta tiene que
      // enseñar el análisis nuevo, no el que se leyó antes de decidir.
      await queryClient.invalidateQueries({
        queryKey: ["systems", "flow-graph"],
      });
    },
  });
}
