"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listNotificationPolicies, saveNotificationPolicy } from "./services";
import type {
  NotificationPolicyQuery,
  NotificationPolicyUpsert,
} from "./types";

const KEY = ["notification-policies"] as const;

export function useNotificationPolicies(query: NotificationPolicyQuery = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => listNotificationPolicies(query),
    // Cambiar de página o de filtro no vacía la tabla: se ve la anterior hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export function useSaveNotificationPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationPolicyUpsert) =>
      saveNotificationPolicy(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
