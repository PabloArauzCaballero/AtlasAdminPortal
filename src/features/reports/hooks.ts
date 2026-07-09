"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getReport,
  listReportSnapshots,
  listReports,
  runReport,
} from "./services";

export function useReports(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.reports(query),
    queryFn: () => listReports(query),
  });
}

export function useReport(reportId: string) {
  return useQuery({
    queryKey: queryKeys.report(reportId),
    queryFn: () => getReport(reportId),
    enabled: Boolean(reportId),
  });
}

export function useReportSnapshots(reportId: string, query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.reportSnapshots(reportId, query),
    queryFn: () => listReportSnapshots(reportId, query),
    enabled: Boolean(reportId),
  });
}

export function useRunReportMutation(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filters: unknown) => runReport(reportId, filters),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["internal", "report", reportId],
        }),
        queryClient.invalidateQueries({ queryKey: ["internal", "reports"] }),
      ]);
    },
  });
}
