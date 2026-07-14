"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  cancelNotificationMessage,
  createNotificationTemplate,
  getCustomerPreferences,
  getNotificationMessage,
  listNotificationMessages,
  listNotificationTemplates,
  retryNotificationMessage,
  sendBroadcastNotification,
  updateCustomerPreferences,
  updateNotificationTemplate,
} from "./services";
import type {
  CreateBroadcastNotificationInput,
  CreateNotificationTemplateInput,
  UpdateNotificationTemplateInput,
  UpdatePreferencesInput,
} from "./types";

export function useNotificationMessages(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.notificationMessages(query),
    queryFn: () => listNotificationMessages(query),
  });
}

export function useNotificationMessage(messageId: string) {
  return useQuery({
    queryKey: queryKeys.notificationMessage(messageId),
    queryFn: () => getNotificationMessage(messageId),
    enabled: Boolean(messageId),
  });
}

export function useRetryNotificationMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => retryNotificationMessage(messageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCancelNotificationMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => cancelNotificationMessage(messageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useNotificationTemplates(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.notificationTemplates(query),
    queryFn: () => listNotificationTemplates(query),
  });
}

export function useCreateNotificationTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNotificationTemplateInput) =>
      createNotificationTemplate(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notifications", "templates"],
      });
    },
  });
}

export function useUpdateNotificationTemplateMutation(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateNotificationTemplateInput) =>
      updateNotificationTemplate(templateId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notifications", "templates"],
      });
    },
  });
}

export function useSendBroadcastNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBroadcastNotificationInput) =>
      sendBroadcastNotification(body),
    onSuccess: async () => {
      // Los mensajes creados por el broadcast aparecen en la lista de "Mensajes" ya entregados.
      await queryClient.invalidateQueries({
        queryKey: ["notifications", "messages"],
      });
    },
  });
}

export function useCustomerPreferences(customerId: string) {
  return useQuery({
    queryKey: queryKeys.notificationPreferences(customerId),
    queryFn: () => getCustomerPreferences(customerId),
    enabled: Boolean(customerId),
  });
}

export function useUpdateCustomerPreferencesMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePreferencesInput) =>
      updateCustomerPreferences(customerId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences(customerId),
      });
    },
  });
}
