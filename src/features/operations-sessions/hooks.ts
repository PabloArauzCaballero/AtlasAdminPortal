"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getSessionInvestigationSummary } from "./services";

export function useSessionInvestigationSummary(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.sessionInvestigationSummary(sessionId),
    queryFn: () => getSessionInvestigationSummary(sessionId),
    enabled: Boolean(sessionId),
  });
}
