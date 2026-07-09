"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { acknowledgeAlert, listAlerts } from "./services";

export function useAlerts(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.alerts(query),
    queryFn: () => listAlerts(query),
  });
}

export function useAcknowledgeAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert(alertId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "alerts"] });
    },
  });
}
