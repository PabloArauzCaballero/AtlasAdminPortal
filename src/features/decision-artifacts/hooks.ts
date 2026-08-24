"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignDecisionArtifact, listDecisionArtifacts } from "./services";
import type { AssignArtifactBody } from "./types";

const KEY = ["decision-artifacts"] as const;

export function useDecisionArtifacts() {
  return useQuery({ queryKey: KEY, queryFn: listDecisionArtifacts });
}

export function useAssignDecisionArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignArtifactBody) => assignDecisionArtifact(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
