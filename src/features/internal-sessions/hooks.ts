"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { listInternalSessions, revokeInternalSessions } from "./services";

export function useInternalSessions(query: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.internalSessions(query),
    queryFn: () => listInternalSessions(query),
    placeholderData: keepPreviousData,
    // Es una foto de quién está dentro: se repinta sola cada minuto para no enseñar una lista vieja.
    refetchInterval: 60_000,
  });
}

export function useRevokeInternalSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { internalUserId: string; reason: string }) =>
      revokeInternalSessions(input.internalUserId, input.reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal-sessions"] });
    },
  });
}
