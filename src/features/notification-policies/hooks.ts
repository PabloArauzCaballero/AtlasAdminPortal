"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotificationPolicies, saveNotificationPolicy } from "./services";
import type { NotificationPolicyUpsert } from "./types";

const KEY = ["notification-policies"] as const;

export function useNotificationPolicies() {
  return useQuery({ queryKey: KEY, queryFn: listNotificationPolicies });
}

export function useSaveNotificationPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationPolicyUpsert) => saveNotificationPolicy(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
