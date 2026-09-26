"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { getJobRun, listJobRuns } from "./services";

export function useJobRuns(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.jobRuns(query),
    queryFn: () => listJobRuns(query),
  });
}

export function useJobRun(jobRunId: string) {
  return useQuery({
    queryKey: queryKeys.jobRun(jobRunId),
    queryFn: () => getJobRun(jobRunId),
    enabled: Boolean(jobRunId),
  });
}
